####################
# Imports
####################

from os import urandom
from base64 import b64encode
import flask
import logging
import random
import string
import re
import bcrypt
import configparser
import os

####################
# Initialize
####################

# parse config
config = configparser.ConfigParser()
config.read(os.path.join("config", "config.ini"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

####################
# Functions
####################

def wrap_response(data: dict, *args, **kwargs) -> flask.Response:
    """
    Wraps json response in flask Response object with appropriate headers.
    Returns:
        response:   flask response
    """
    json = flask.jsonify(data)
    response = flask.make_response(json, *args, **kwargs)
    # FIXME possible security issue
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = True
    return response


def gen_verify_key() -> str:
    """
    Generates a verification key-- a random string of 6 numbers.
    """
    return "".join(random.choices(string.digits, k=6))


def hash_password(password) -> str:
    """
    Hash a password.
    Params:
        password:   password to hash
    Returns:
        hashed      hashed password
    """

    logger.info(config["AUTH"]["SALT"])
    
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())


def is_uo_email(email: str) -> bool:
    """
    Checks if an email address is a University of Oregon email.
    Params:
        email:  email address
    Returns:
        is_uo:  True if UO email, otherwise False.
    """
    pattern = r".+@uoregon.edu$"
    return re.match(pattern, email) is not None

def check_date(min_ts, max_ts, event_ts):
    """
    Checks if an event timestamp is within given parameters
    Params:
        min_ts: minimum timestmap
        max_ts: maximum timetamp
        event_ts: event timestamp
    returns:
        bool
    """
    if min_ts == 0 and max_ts == 0:
        logger.info(1)
        return 1
    elif min_ts != 0 and max_ts == 0:
        logger.info(2)
        return event_ts >= min_ts
    elif min_ts != 0 and max_ts != 0:
        logger.info(3)
        return event_ts >= min_ts and event_ts <= max_ts
    else:
        return event_ts <= max_ts