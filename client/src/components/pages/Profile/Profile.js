
import React, { Profiler } from "react";
import {useState, useEffect} from "react";
import "./Profile.css";
import Sidebar from "../../Sidebar.js"
import {useNavigate} from "react-router-dom";
import TestIMG from "../../imgs/blank_photo.jpeg";
import {apiUrl} from "../../../util/constants.js";


import Location from "../../imgs/location.svg"
import Clock from "../../imgs/clock.svg"
import Calendar from "../../imgs/calendar.svg"

const Core = () => {
    return (
        <div className="profile_core core">
            <Sidebar />
            <ProfileInfo />
        </div>
    )
}

async function getProfile() {
    const address = `${apiUrl}/get_profile`;
    const response = await fetch(address, {
        method: "GET",
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "auth": localStorage.getItem("jwt"),
        }
    });
    const result = await response.json();
    return result["user"]
}

const ProfileInfo = () => {
    // add request to get profile info

    const [toggle, setToggle] = useState(0)
    const [name, setName] = useState("")
    const [showEdit, setShowEdit] = useState(0);
    const [userid, setUserId] = useState("")
    const [image, setImage] = useState("")
    const [bio, setBio] = useState("")

    let profile_info = {
        name: "stuarth",
        photo_url: "",
        bio: "senior computer science student at UO"
    }

    const promptEdit = () => {
        setShowEdit(1)
    }

    const handleDetails = (result) => {
        setUserId(result["user_id"])
        setName(result["email"].split("@")[0])
        setImage(result["image"])
        setBio(result["bio"])
    }

    useEffect(() => {
        getProfile().then(result => handleDetails(result))
    }, [])

    return (
        <div className="profile_wrapper">
            <div className="profile_header">
                <div className="profile_image">
                    <img src={(image != "") ? `${apiUrl}/get_image/users/${userid}/${image}` : null} />
                </div>
                <div className="profile_details">
                    <h1>{name}</h1>
                    <p>{bio}</p>
                    <p className="edit" onClick={() => promptEdit()}>edit</p>
                </div>
            </div>
            <div className="profile_content">
                <ProfileSelector toggle={toggle} setToggle={setToggle}/>
                {(toggle === 0) ? <EventView /> : null}
                {(toggle === 1) ? <RSVPView /> : null}
                {(toggle === 2) ? <LikesView/> : null}
            </div>
            <EditProfile handleDetails={handleDetails} showEdit={showEdit} setShowEdit={setShowEdit}/>
        </div>
    )
}

const EditProfile = ({showEdit, setShowEdit, handleDetails}) => {
    const [image, setImage] = useState("")
    const [bio, setBio] = useState("")

    const submitEdits = () => {
        async function editProfile() {
            let formData = new FormData()
            formData.append("image", image)
            formData.append("bio", bio)

            const address = `${apiUrl}/edit_user`;
            const response = await fetch(address, {
                method: "POST",
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "auth": localStorage.getItem("jwt"),
                },
                body: formData
            });
            const result = await response.json();
            console.log(result)
            return result
        }
        editProfile().then(() => getProfile().then(result => handleDetails(result)))
        setImage("")
        setBio("")
        setShowEdit(0);
    }

    const handleImage = (file) => {
        if(file.type.includes('image')){
            setImage(file)
        }
    }

    return (
        <div className={(showEdit) ? "edit_form show_edit" : "edit_form"}>
            <h1>Edit profile</h1>
            <label className="profile_upload">
                <input type="file" onChange={event => handleImage(event.target.files[0])}/> 
                {(image === "") ? "Upload Photo" : image.name}
            </label>
            <input type="text" placeholder="Enter a bio" value={bio} onChange={e => setBio(e.target.value)}/>
            <div className="edit_buttons">
                <button onClick={() => submitEdits()}>Submit Changes</button>
                <button className="cancel" onClick={() => setShowEdit(0)}>X</button>
            </div>
        </div>
    )
}

const ProfileSelector = ({toggle, setToggle}) => {
    return (
        <div className="selector_wrapper">
            <p className={(toggle === 0) ? "select" : ""} onClick={() => setToggle(0)}>Events</p>
            <p className={(toggle === 1) ? "select" : ""} onClick={() => setToggle(1)}>RSVPs</p>
            <p className={(toggle === 2) ? "select" : ""} onClick={() => setToggle(2)}>Likes</p>
        </div>
    )
}

const EventView = () => {
    const [events, setEvents] = useState([])

    useEffect(() => {
        async function getUserEvents() {
            const address = `${apiUrl}/user_events`;
            const response = await fetch(address, {
                method: "GET",
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "auth": localStorage.getItem("jwt"),
                }
            });
            const result = await response.json()
            console.log(result)
            return result["events"]
        }

        getUserEvents().then(response => setEvents(response))
    }, [])

    return (
        <div className="event_view">
            <EventDisplay events={events}/>
        </div>
    )
}

const RSVPView = () => {
    const [events, setEvents] = useState([])

    useEffect(() => {
        async function getRSVPs() {
            const address = `${apiUrl}/user_rsvps`;
            const response = await fetch(address, {
                method: "GET",
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "auth": localStorage.getItem("jwt"),
                }
            });
            const result = await response.json()
            console.log(result)
            return result["rsvps"]
        }

        getRSVPs().then(response => setEvents(response))
    }, [])

    return (
        <div className="rsvp_view">
            <EventDisplay events={events}/>
        </div>
    )
}

const LikesView = () => {
    const [events, setEvents] = useState([])

    useEffect(() => {
        async function getLikes() {
            const address = `${apiUrl}/user_likes`;
            const response = await fetch(address, {
                method: "GET",
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "auth": localStorage.getItem("jwt"),
                }
            });
            const result = await response.json()
            return result["likes"]
        }

        getLikes().then(response => setEvents(response))
    }, [])

    return (
        <div className="likes_view">
            <EventDisplay events={events}/>
        </div>
    )
}

const EventDisplay = ({events}) => {
    const [max, setMax] = useState(8)

    return (
        <div className="profile_entries">
            {
                events.slice(0, max).map(
                    (entry, index) =>
                    <EventEntry 
                    title={entry["name"]} 
                    submitter={entry["user"].split("@")[0]}
                    date={entry["date"]}
                    start={entry["start"]}
                    end={entry["end"]} 
                    location={entry["location"]}
                    event_id={entry["_id"]}
                    image={entry["event_photo"]}
                    key={index}
                    index={index}
                    />
                )
            }
            <p className="load" onClick={() => setMax(max + 8)}>Click to load more</p>
        </div>
    )
}


const EventEntry = ({title, submitter, start, end, date, location, event_id, image, index}) => {
  
    const convertTime = (time) => {
      let time_split = time.split(":")
      let hour = time_split[0]
      let minute = time_split[1]
  
      if(hour == 12){
        return hour + ":" + minute + " PM"
      }
      else if(hour > 12){
        return (parseInt(hour) % 12) + ":" + minute + " PM"
      }
      else{
        return time + " AM"
      }
    }
  
    const convertDate = (date_val) => {
      let date_split = date_val.split("-")
      let year = date_split[0].slice(2,4)
      let month = date_split[1]
      let day = date_split[2]
  
      return month + "/" + day + "/" + year
    }
  
    return(
      <a href={"/Event?id=" + event_id}>
        <div className={(index === 0) ? "profile_entry first" : "profile_entry"}>
        <div className="entry_img">
          <img src={`${apiUrl}/get_image/${event_id}/${image}`} />
        </div>
        <div className="profile_entry_info">
          <div className="event_header_wrapper">
            <p className="event_title">{title}</p>
            <p className="event_submitter">{submitter}</p>
          </div>
          <div className="event_datetime">
            <p className="location"><img src={Location}/>{location}</p>
            <p className="date"><img src={Calendar} />{convertDate(date)}</p>
            <p className="time"><img src={Clock} />{convertTime(start)} - {convertTime(end)}</p>
          </div>
        </div>
      </div>
      </a>
    )
}

function Profile() {
    return (
        <div>
            <Core />
        </div>
    );
}

export default Profile;