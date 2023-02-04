####################
# Imports
####################

import flask
from flask import Flask, request, abort, redirect, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from util.utilities import wrap_response, gen_verify_key, hash_password, is_uo_email, check_date
import configparser
import os
import logging
import json
from pymongo import MongoClient
from bson.objectid import ObjectId
import werkzeug.datastructures
import random
import string
import jwt
import send_emails
import bcrypt
import time, datetime
import subprocess

####################
# Initialize
####################

# parse config
config = configparser.ConfigParser()
config.read(os.path.join("config", "config.ini"))

# initialize flask app
app = Flask(__name__)
app.config.update(
    SECRET_KEY = config["DEFAULT"]["SECRET_KEY"],
)
CORS(app, supports_credentials=True)

# FIXME these lines introduce security problems; for development environment only
app.config["Access-Control-Allow-Origin"] = "*"

# logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# database
mongo_client = MongoClient("mongodb://mongodb:27017/")
db = mongo_client["dev"]

# auth
JWT_ALGO = config["AUTH"]["JWT_ALGORITHM"]

# file system
IMAGES_DIR = "./images"

####################
# Utilities
####################

def ordered_storage(function):
    """
    Decorator that ensures request parameters are received in the order sent.
    """
    def wrapper(*args, **kwargs):
        request.parameter_storage_class = werkzeug.datastructures.ImmutableOrderedMultiDict
        return function(*args, **kwargs)

    # avoid conflicting wrapper names with Flask decorators
    wrapper.__name__ = function.__name__
    return wrapper

####################
# Auth
####################

def generate_jwt(payload: dict):
    """
    Generates an encoded JSON web token.
    Params:
        payload:    data to encrypt
    Returns:
        token:      JSON web token
    """
    return jwt.encode(payload, app.secret_key, algorithm=JWT_ALGO)


def decode_jwt(encrypted_token: str):
    """
    Decrypts an encoded JSON web token.
    Params:
        encrypted_token:    encrypted token to decrypt
    Returns:
        token:              decrypted data
    """
    # TODO verify_exp:False creates security issues but makes our lives convenient for now
    return jwt.decode(encrypted_token, app.secret_key, algorithms=[JWT_ALGO], options={'verify_exp': False})


def require_verified(function) -> flask.Response:
    """
    A decorator for Flask views that returns a 401 error if the user is not logged in to a verified account.
    Make sure this decorator is placed below the @app.route decorator.
    Params:
        function:   decorated function
    Returns:
        response:   Flask response
    """
    def wrapper(*args, **kwargs):
        encrypted_token = request.headers.get("auth")
        if encrypted_token is None:
            return abort(401)
        
        token = decode_jwt(encrypted_token)
        db_user_id = ObjectId(token["user_id"])
        user = db["users"].find_one(db_user_id)
        if user is None:
            # can't find user
            return abort(401)
        if user["verified"] == 0:
            # user not verified
            return abort(401)
        
        # user is verified
        return function(*args, **kwargs)
    
    # avoid conflicting wrapper names with Flask decorators
    wrapper.__name__ = function.__name__
    return wrapper
    

@app.route("/api/register", methods=["POST"])
def register():
    """
    Register a user.
    Request:
        email:          user's email
        password:       user's (already-hashed) password. Will be hashed again.
    Response:
        Success:
            jwt_token:  a jwt token to send to the server
        Error:
            errors:     list of error messages
    """
    email = request.form.get("email")
    password = hash_password(request.form.get("password"))

    # ensure it's a UO email
    if not is_uo_email(email):
        return wrap_response({"errors": ["You must provide a UO email"]}, 400)
    
    users = db["users"]
    user_using_email = users.find_one({"email": email})
    if user_using_email is not None:
        # a user is already using this email
        return wrap_response({"errors": ["An account already exists with that email."]}, 400)
    
    # otherwise, this is a brand new user
    verify_key = gen_verify_key()
    insert_result = users.insert_one({"email": email, "password": password, "verified": 0, "verify_key": verify_key, "bio": "", "image": ""})
    _id = str(insert_result.inserted_id)

    logger.info(f"===verify key=== {verify_key}")
    email_success = send_emails.send_email(email, "Quack Verification Key", f"Here is your Quack verification key: {verify_key}")
    if not email_success:
        return wrap_response({"errors": ["Error emailing verification key."]}, 500)

    token = generate_jwt({"user_id": _id})
    return wrap_response({"jwt": token}, 200)


@app.route("/api/verify", methods=["POST"])
def verify():
    """
    Verify a user.
    Request:
        jwt:            json web token given by server
        verify_key:     verification key from email
    Response:
        Success:
            message:    success message
        Error:
            errors:     list of error messages
    """
    encrypted_token = request.form.get("jwt")
    token = decode_jwt(encrypted_token)
    user_id = token["user_id"]
    db_user_id = ObjectId(user_id)
    submitted_key = request.form.get("verify_key")
    
    users = db["users"]
    user = users.find_one({"_id": db_user_id})
    if user is None:
        return wrap_response({"errors": ["User not found."]}, 400)

    actual_key = user["verify_key"]
    if submitted_key != actual_key:
        return wrap_response({"errors": ["Unable to verify account."]}, 400)

    users.update_one(
        {"_id": db_user_id},
        {"$set": {"verified": 1}}
    )
    return wrap_response({"message": "Successfully verified."}, 200)


@app.route("/api/login", methods=["POST"])
def login():
    """
    Log in a user.
    Request:
        email:          user's email
        password:       user's password
    Response:
        Success:
            jwt:        token to send to server with requests
        Error:
            errors:     list of error messages
    """
    email = request.form.get("email")
    password = request.form.get("password")

    users = db["users"]
    user = users.find_one({"email": email})
    
    if user is None:
        return wrap_response({"errors": ["Email or password is wrong."]}, 400)
    if bcrypt.hashpw(password.encode('utf-8'), user["password"]) != user["password"]:
        return wrap_response({"errors": ["Email or password is wrong."]}, 400)
    
    _id = str(user["_id"])
    encrypted_token = generate_jwt({"user_id": _id})
    return wrap_response({"jwt": encrypted_token})


@app.route("/api/test_verified", methods=["GET"])
@require_verified
def test_verified():
    return wrap_response({"message": "ya you're verified"}, 200)


@app.route("/api/check_login", methods=["GET"])
def check_login():
    """
    Checks if a user is logged in

    Response:
        logged_in:      0 or 1

    """
    # if user jwt contains valid user_id, then return true
    # if user_id is invalid, or no jwt is sent, return false
    # will use this to restrict access to certain components, change app view
    encrypted_token = request.headers.get("auth")
    if encrypted_token is None or encrypted_token == "null":
        return wrap_response({"logged_in": 0})
        
    token = decode_jwt(encrypted_token)
    db_user_id = ObjectId(token["user_id"])
    user = db["users"].find_one(db_user_id)
    if user is None:
        # can't find user
        return wrap_response({"logged_in": 0})
    if user["verified"] == 0:
        # user not verified
        return wrap_response({"logged_in": 0})

    return wrap_response({"logged_in": 1})

####################
# Resources
####################
@app.route("/api/user_rsvps", methods=["GET"])
@require_verified
def user_rsvps():
    """
    Gets all events a specific user rsvped for
    Response:
        Success:
            events:     list of event objects
        Error:
            errors:     list of error messages
    """
    encrypted_token = request.headers.get("auth")
    token = decode_jwt(encrypted_token) 
    user_id = token["user_id"]
    
    collection = db["event_attendees"]
    event_list = db["events"]
    
    rsvps = list(collection.find({"user_id": user_id}))

    events = []
    for rsvp in rsvps:
        event_id = rsvp["event_id"]
        event = event_list.find_one({"_id": ObjectId(event_id)})
        event["_id"] = event_id
        events.append(event)

    return wrap_response({"rsvps": events}, 200)

@app.route("/api/user_likes", methods=["GET"])
@require_verified
def user_likes():
    """
    Gets all events a specific user has liked
    Response:
        Success:
            events:     list of event objects
        Error:
            errors:     list of error messages
    """
    encrypted_token = request.headers.get("auth")
    token = decode_jwt(encrypted_token) 
    user_id = token["user_id"]
    
    collection = db["event_interested"]
    event_list = db["events"]
    
    likes = list(collection.find({"user_id": user_id}))

    events = []
    for like in likes:
        event_id = like["event_id"]
        logger.info(like["timestamp"])
        event = event_list.find_one({"_id": ObjectId(event_id)})
        event["_id"] = event_id
        events.append(event)

    return wrap_response({"likes": events}, 200)


@app.route("/api/user_events", methods=["GET"])
@require_verified
def user_events():
    """
    Gets all events a specific user has posted
    Response:
        Success:
            events:     list of event objects
        Error:
            errors:     list of error messages
    """
    encrypted_token = request.headers.get("auth")
    token = decode_jwt(encrypted_token) 
    user_id = token["user_id"]
    
    event_list = db["events"].find({"user_id": user_id})

    events = []
    for event in event_list:
        event["_id"] = str(event["_id"])
        events.append(event)
    
    return wrap_response({"events": events}, 200)


@app.route("/api/get_events", methods=["POST"])
def get_events():
    """
    Gets all events for the Dashboard
    Response:
        Success:
            events:     list of event objects
        Error:
            errors:     list of error messages
    """
    collection = db['events']
    events = list(collection.find({}))

    min_date = request.form.get("start")
    max_date = request.form.get("end")

    min_ts = 0
    max_ts = 0
    if min_date != "":
        min_ts = datetime.datetime.strptime(min_date, "%Y-%m-%d").timestamp()
    if max_date != "":
        max_ts = datetime.datetime.strptime(max_date, "%Y-%m-%d").timestamp()


    likes = db["event_interested"]

    new_events = []
    for event in events:
        event["_id"] = str(event["_id"])



        event_timestamp = datetime.datetime.strptime(event["date"], "%Y-%m-%d").timestamp()
        
        if check_date(min_ts, max_ts, event_timestamp):
            like_count = len(list(likes.find({'event_id': event["_id"]})))
            event["like_count"] = like_count
            new_events.append(event)


    return wrap_response({"events": new_events}, 200)


@app.route("/api/event_comments", methods=["POST"])
def event_comments():
    """
    Gets a list of all comments for a specific event.
    Request:
        event_id:       id of the event
    Response:
        Success:
            comments:   list of dictionaries representing comments: {user_id, content, likes}
        Error:
            errors:     list of error messages
    """
    event_comments = db["event_posts"]
    event_id = request.form.get("event_id")
    comments = event_comments.find({"event_id": event_id})

    users = db["users"]

    comments_list = []
    for comment in comments:
        
        db_user_id = ObjectId(comment["user_id"])
        user = users.find_one({"_id": db_user_id})

        comments_list.append({
            "user": user["email"],
            "content": comment["content"],
            "likes": comment["likes"],
            "attached_multimedia": comment["attached_multimedia"],
            "ts": time.time() - comment["timestamp"]
        })
    
    return wrap_response({"comments": comments_list}, 200)


@app.route("/api/post_comment", methods=["POST"])
@require_verified
def post_comment():
    """
    Posts a comment on an event page.
    Request:
        event_id:               id of the event
        content:                comment text
        attached_multimedia:    FIXME idk
        is_active:              FIXME idk
    Response:
        Success:
            message:            ok
        Error:
            errors:             list of errors
    """
    encrypted_token = request.headers.get("auth")
    token = decode_jwt(encrypted_token)
    user_id = token["user_id"]

    event_comments = db["event_posts"]
    event_comments.insert_one({
        "user_id": user_id,
        "event_id": request.form.get("event_id"),
        "content": request.form.get("content"),
        "timestamp": time.time(),
        "likes": 0,
        # TODO not sure what this is
        "attached_multimedia": request.form.get("attached_multimedia"),
        # TODO not sure what this is
        "is_active": 1
    })
    return wrap_response({"message": "posted comment"}, 200)


@app.route("/api/event_info", methods=["POST"])
def event_info():
    """
    Gets info for the Event page for a specific 
    event, based on an event ID. The request will 
    post the event ID to the server, and receive 
    all the info needed by the event for display. 
    Event id will be wrapped in form data
    Request:
        event_id:       id of event
    Response:
        Success:
            response:   object containing event info
        Error:
            errors:     list of error messages
    """
    events = db["events"]
    event_id = ObjectId(request.form.get("event_id"))
    event = events.find_one({"_id": event_id})
    if event is None:
        return wrap_response({"errors": ["Event not found."]}, 404)

    return wrap_response({
        "title": event["name"],
        "description": event["description"],
        "address": event["address"],
        "date": event["date"],
        "start": event["start"],
        "end": event["end"],
        "user_id": event["user_id"],
        "user": event["user"],
        "location": event["location"],
        "event_photo": event["event_photo"],
        "attendants": event["attendants"],
        "interesteds": event["interesteds"],
        "target_audience": event["target_audience"],
        "is_online": event["is_online"],
        "online_address": event["online_address"],
        "ticket_link": event["ticket_link"],
        "cost": event["cost"],
        "organization_id": event["organization_id"],
        "is_active": event["is_active"]
    }, 200)

@app.route("/api/create_event", methods=["POST"])
@require_verified
def create_event():
    """
    Collect data from user request to create a new event
    Add event to database
    """
    # access form fields
    name = request.form.get("name")
    description = request.form.get("description")
    location = request.form.get("location")
    address = request.form.get("address")
    date = request.form.get("date")
    start = request.form.get("start")
    end = request.form.get("end")
    image = request.files['image']

    errors = []

    if('image' not in request.files):
        errors.append("An event image must be uploaded.")
    else:
        image = request.files['image']

    encrypted_token = request.headers.get("auth")
    token = decode_jwt(encrypted_token) 
    user_id = token["user_id"]
    db_user_id = ObjectId(user_id)
    
    users = db["users"]
    user = users.find_one({"_id": db_user_id})

    email = user["email"]

    # FIXME - what fields should be required?

    if name == "":
        errors.append("Event name must be provided.")
    if description == "":
        errors.append("Description must be provided.")
    if location == "":
        errors.append("Location must be provided.")
    if location == "Pick a building":
        errors.append("Pick a location from the dropdown.")
    if date == "":
        errors.append("Date must be provided.")
    if start == "":
        errors.append("Start time must be provided.")
    if end == "":
        errors.append("End time must be provided.")
    if not image:
        errors.append("An event image must be uploaded.")

    format = "%H:%M"
    start_ts = time.mktime(time.strptime(start, format))
    end_ts = time.mktime(time.strptime(end, format))

    if start_ts > end_ts:
        errors.append("End time must be after start time.")

    if len(errors) > 0:
        return wrap_response({"errors": errors}, 400)
    
    events = db["events"]
    # insert new event
    insert_result = events.insert_one({
        "name": name, 
        "description": description, 
        "location": location, 
        "address": address,
        "date": date,
        "start": start,
        "end": end,
        "user": email,
        "user_id": user_id,
        "event_photo": image.filename.replace(" ", "_"),
        "attendants": "",
        "interesteds": "",
        "target_audience": "",
        "is_online": "",
        "online_address": "",
        "ticket_link": "",
        "cost": "",
        "organization_id": "",
        "is_active": ""
    })
    _id = str(insert_result.inserted_id)

    path = f"{IMAGES_DIR}/{_id}"
    if not os.path.exists(path):
        os.makedirs(path)
    image.save(os.path.join(path, secure_filename(image.filename)))

    return wrap_response({"event_id": _id}, 200)

@app.route("/api/get_interactions", methods=["POST"])
def get_interactions():
    """
    Returns a response to the client indicating whether a user has liked or RSVPd an event

    Request:
        event_id:       the liked/rsvpd event
    Response:
        interactions:   object containing a 1 or 0 for like and rsvp
    """
    encrypted_token = request.headers.get("auth")
    if encrypted_token is None:
        return wrap_response({"interactions": {"like": 0, "rsvp": 0}})

    token = decode_jwt(encrypted_token) 
    user_id = token["user_id"]
    event_id = request.form.get("event_id")

    likes = db["event_interested"]
    rsvps = db["event_attendees"]

    found_like = likes.find_one({"user_id": user_id, "event_id": event_id})
    found_rsvp = rsvps.find_one({"user_id": user_id, "event_id": event_id})

    response_like = 0
    response_rsvp = 0

    if(found_like):
        response_like = 1
    if(found_rsvp):
        response_rsvp = 1

    return wrap_response({"interactions": {"like": response_like, "rsvp": response_rsvp}})

@app.route("/api/get_interact_count", methods=["POST"])
def get_interact_count():
    """
    Returns the number of likes and RSVPs an event has received

    Request:
        event_id:   the event id
    Response:
        counts:     the like and rsvp counts
    """
    event_id = request.form.get("event_id")

    likes = list(db["event_interested"].find({"event_id": event_id}))
    rsvps = list(db["event_attendees"].find({"event_id": event_id}))

    return wrap_response({"counts": {"likes": len(likes), "rsvps": len(rsvps)}})

@app.route("/api/like_event", methods=["POST"])
@require_verified
def like_event():
    """
    Saves an event like to the database
    
    Request:
        event_id:   the event id
    Response:
        message:    success/removal message
    """
    encrypted_token = request.headers.get("auth")
    token = decode_jwt(encrypted_token) 
    user_id = token["user_id"]
    event_id = request.form.get("event_id")

    likes = db["event_interested"]

    found = likes.find_one({"user_id": user_id, "event_id": event_id})

    if(found is None):
        insert_result = likes.insert_one({
            "user_id": user_id,
            "event_id": event_id,
            "timestamp": time.time()
        })

        _id = str(insert_result.inserted_id)

        return wrap_response({"message": "successful like " + _id}, 200)
    else:
        likes.delete_one({"user_id": user_id, "event_id": event_id})
    
    return wrap_response({"message": "already liked, removed"}, 200)

@app.route("/api/rsvp_event", methods=["POST"])
@require_verified
def rsvp_event():
    """
    Saves an event rsvp to the database

    Request:
        event_id:   the event id
    Response:
        message:    success/removal message
    """
    encrypted_token = request.headers.get("auth")
    token = decode_jwt(encrypted_token) 
    user_id = token["user_id"]
    event_id = request.form.get("event_id")

    rsvps = db["event_attendees"]

    found = rsvps.find_one({"user_id": user_id, "event_id": event_id})

    if(found is None):
        insert_result = rsvps.insert_one({
            "user_id": user_id,
            "event_id": event_id,
            "time": time.time()
        })
        _id = str(insert_result.inserted_id)

        return wrap_response({"message": "successful rsvp " + _id}, 200)
    else:
        rsvps.delete_one({"user_id": user_id, "event_id": event_id})
    
    return wrap_response({"message": "already rsvp, removed"}, 200)


@app.route('/api/get_image/<path:path>', methods=["GET"])
def get_image(path):
    """
    Retrieves an image from file system

    Response:
        file:   image that is being retrieved at path
    """
    response = send_file(f"{IMAGES_DIR}/{path}", mimetype='image/jpg')
    response.headers['Content-Transfer-Encoding']='base64'
    return response


@app.route('/api/get_profile', methods=["GET"])
@require_verified
def get_profile():
    """
    Gets all profile details

    Response:
        user:   contains email, image path, bio, user_id
    """

    encrypted_token = request.headers.get("auth")
    token = decode_jwt(encrypted_token) 
    user_id = token["user_id"]
    db_user_id = ObjectId(user_id)

    users = db["users"]
    user = users.find_one({"_id": db_user_id})


    return wrap_response({"user": {"email": user["email"], "image": user["image"], "bio": user["bio"], "user_id": str(user["_id"])}}, 200)

@app.route('/api/map_events', methods=["POST"])
def map_events():
    """
    Retrieves events for a particular location

    Request:
        location:   location string
    Response:
        events:     list of event objects
    """
    location = request.form.get("location")

    min_date = request.form.get("start")
    max_date = request.form.get("end")

    min_ts = 0
    max_ts = 0
    if min_date != "":
        min_ts = datetime.datetime.strptime(min_date, "%Y-%m-%d").timestamp()
    if max_date != "":
        max_ts = datetime.datetime.strptime(max_date, "%Y-%m-%d").timestamp()


    events = list(db["events"].find({"location": location}))

    new_events = []
    for event in events:
        event["_id"] = str(event["_id"])

        event_timestamp = datetime.datetime.strptime(event["date"], "%Y-%m-%d").timestamp()
        
        if check_date(min_ts, max_ts, event_timestamp):
            new_events.append(event)


    return wrap_response({"events": new_events}, 200)

@app.route('/api/get_feed', methods=["GET"])
def get_feed():
    """
    Retrieves list of recent interactions

    Response:
        interactions:   list of interaction objects
    """

    current_timestamp = time.time()
    users = db["users"]
    events = db["events"]
    likes = list(db["event_interested"].find({}))


    interactions = []
    for like in likes:
        user = users.find_one({"_id": ObjectId(like["user_id"])})
        event = events.find_one({"_id": ObjectId(like["event_id"])})

        entry = {}
        entry["action"] = "liked"
        entry["user"] = user["email"]
        entry["event"] = event["name"]
        entry["event_id"] = like["event_id"]
        entry["ts"] =  current_timestamp - like["timestamp"]

        interactions.append(entry)

    comments = list(db["event_posts"].find({}))
    for comment in comments:
        user = users.find_one({"_id": ObjectId(comment["user_id"])})
        event = events.find_one({"_id": ObjectId(comment["event_id"])})
        entry = {}
        entry["action"] = "commented"
        entry["user"] = user["email"]
        entry["event"] = event["name"]
        entry["event_id"] = comment["event_id"]
        entry["ts"] =  current_timestamp - comment["timestamp"]

        interactions.append(entry)


    return wrap_response({"interactions": interactions}, 200)

@app.route('/api/edit_user', methods=["POST"])
@require_verified
def edit_user():
    """
    Stores new user info on the database

    Request:
        image:      user's profile photo
        bio:        user's bio string
    Response:
        message:    informs user of successful api call
    """

    encrypted_token = request.headers.get("auth")
    token = decode_jwt(encrypted_token) 
    user_id = token["user_id"]
    db_user_id = ObjectId(user_id)
    bio = request.form.get("bio")
    
    users = db["users"]

    if('image' in request.files):
        image = request.files['image']

        path = f"{IMAGES_DIR}/users/{user_id}"
        if not os.path.exists(path):
            os.makedirs(path)
        image.save(os.path.join(path, secure_filename(image.filename)))

        users.update_one({"_id": db_user_id}, {"$set": {"image": image.filename.replace(" ", "_")}})


    if(bio != ""):
        users.update_one({"_id": db_user_id}, {"$set": {"bio": bio}})

    return wrap_response({"message": "successful api call"}, 200)

####################
# Main
####################

def main():
    print("starting app!")

    ### FIXME these lines create a fresh environment each time you run the app ###
    db["users"].drop()
    db["events"].drop()
    db["event_interested"].drop()
    db["event_attendees"].drop()
    db["event_posts"].drop()
    subprocess.run(f"rm -rf {IMAGES_DIR}", shell=True)
    ######

    if not os.path.isdir(IMAGES_DIR):
        subprocess.run(f"mkdir {IMAGES_DIR}", shell=True)
    
    # FIXME get port from config file
    # debug=True allows us to see print statements in the terminal
    app.run(debug=True, host="0.0.0.0", port=5432)


if __name__ == "__main__":
    main()
