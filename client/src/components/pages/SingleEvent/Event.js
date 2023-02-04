import React from "react";
import {useState, useEffect} from "react";
import "./Event.css";
import Sidebar from "../../Sidebar.js"
import {useNavigate} from "react-router-dom";
import Location from "../../imgs/location.svg"
import Clock from "../../imgs/clock.svg"
import Calendar from "../../imgs/calendar.svg"

import {apiUrl} from "../../../util/constants.js";
import TestIMG from "../../imgs/test_image.png"

import { MapContainer, TileLayer, useMap, Marker, Popup} from 'react-leaflet'


// add component calls in here
const Core = () => {
    const [info, setEventInfo] = useState({location: "", address: "", title: "", submitter: "", start: "", end: "", date: "", user: "", event_photo: ""})

    let event_id = null;
    const query = new URLSearchParams(window.location.search);
    const token = query.get("id");
    if (token !== null) {
      event_id = token;
    }

    let formData = new FormData();
    formData.append("event_id", event_id)

    async function getEvent() {
      const address = `${apiUrl}/event_info`;
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
      return result
    }

    useEffect(() => {
        getEvent().then(result => setEventInfo(result))
      }, []
    )


    return (
      <div className="core">
        <Sidebar />
        <EventInfo info={info} event_id={event_id}/>
      </div>
    )
}

async function getInteractions(formData) {  
  const address = `${apiUrl}/get_interactions`;
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
  return result["interactions"]
}

async function getInteractCount(formData) {  
  const address = `${apiUrl}/get_interact_count`;
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
  return result["counts"]
}

const EventInfo = ({info, event_id}) => {
  const [liked, setLiked] = useState(0)
  const [rsvpd, setRsvpd] = useState(0)

  const [likeCount, setLikeCount] = useState(0)
  const [rsvpCount, setRsvpCount] = useState(0)

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

  const handleRSVP = () => {
    let formData = new FormData()
    formData.append("event_id", event_id)

    async function likeEvent() {
      const address = `${apiUrl}/rsvp_event`;
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
      return result
    }

    likeEvent().then(() => getInteractions(formData).then(result => afterInteract(result)))
  }
  const handleLike = () => {
    let formData = new FormData()
    formData.append("event_id", event_id)

    async function likeEvent() {
      const address = `${apiUrl}/like_event`;
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
      return result
    }

    likeEvent().then(() => getInteractions(formData).then(result => afterInteract(result)))
  }

  const afterInteract = (result) => {
    setLiked(result["like"])
    setRsvpd(result["rsvp"])

    let formData = new FormData()
    formData.append("event_id", event_id)
    getInteractCount(formData).then(response => {setLikeCount(response["likes"]); setRsvpCount(response["rsvps"])}) 
  }

  useEffect(() => {
    let formData = new FormData()
    formData.append("event_id", event_id)

    getInteractions(formData).then(result => {setLiked(result["like"]); setRsvpd(result["rsvp"])})
    getInteractCount(formData).then(response => {setLikeCount(response["likes"]); setRsvpCount(response["rsvps"])}) 
  }, [])
  
  return (
    <div className="event_wrapper">
      <div className="info_container">
        <div className="info_header">
          <div className="event_image">
            <img src={(info.event_photo != "") ? `${apiUrl}/get_image/${event_id}/${info.event_photo}` : null} />
          </div>
          <div className="header_text">
            <div className="title_author">
              <h1>{info.title}</h1>
              <p>{info.user.split("@")[0]}</p>
            </div>
            <div className="dateloc_info">
              <p className="loc"><img src={Location}/><a href={'https://www.google.com/maps?q=' + info.address}>{info.location}</a></p>
              <p className="date"><img src={Calendar} />{convertDate(info.date)}</p>
              <p className="time"><img src={Clock} />{convertTime(info.start)} - {convertTime(info.end)}</p>
            </div>
          </div>
        </div>
        <div className="desc_section">
            <p className="sec_header">Description</p>
            <p>{info.description}</p>
        </div>
        <InteractSection liked={liked}
          handleLike={handleLike}
          rsvpd={rsvpd}
          handleRSVP={handleRSVP}
          event_id={event_id} 
          likeCount={likeCount} 
          rsvpCount={rsvpCount}
        />
        <CommentSection event_id={event_id}/>
      </div>
    </div>
  )
}

const InteractSection = ({liked, rsvpd, handleLike, handleRSVP, event_id, likeCount, rsvpCount}) => {
  

  return (
    <div className="interact_section">
      <div className="button_wrapper">
        <button className={(liked) ? "clicked" : ""} onClick={() => handleLike()}>{(liked) ? "Unlike" : "Like"}</button>
        <div className="count"><p>{likeCount}</p></div>
      </div>
      <div className="button_wrapper">
        <button className={(rsvpd) ? "clicked" : ""} onClick={() => handleRSVP()}>{(rsvpd) ? "Cancel" : "RSVP"}</button>
        <div className="count"><p>{rsvpCount}</p></div>
      </div>
    </div>
  )
}

const CommentSection = ({event_id}) => {
  const [reply, setReply] = useState('')
  const [replies, setReplies] = useState([])

  async function getComments() {
    let formData = new FormData()
    formData.append("event_id", event_id)
    const address = `${apiUrl}/event_comments`;
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
    return result
  }

  const handleReply = () => {
    if(reply.length > 0){
      let formData = new FormData();
      formData.append("event_id", event_id)
      formData.append("content", reply)
      setReply('')


      async function sendComment() {
        const address = `${apiUrl}/post_comment`;
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
        return result
      }

      sendComment().then(() => getComments().then(result => setReplies(result["comments"].sort((a, b) => a.ts - b.ts))))

    }
  }

  useEffect(() => {
    getComments().then(result => setReplies(result["comments"].sort((a, b) => a.ts - b.ts)))
  }, [])

  return(
    <div className="comment_section">
      <div className="comment_input">
        <textarea rows="2" maxLength="180" placeholder="Post a reply..." 
        value={reply}
        onChange={event => setReply(event.target.value)}
        />
        <button onClick={() => {handleReply(); getComments()}}>Reply</button>
      </div>
      <ReplyList replies={replies}/>
    </div>
  )
}

const ReplyList = ({replies}) => {
  const [max, setMax] = useState(5)


  return (
    <div className="reply_list">
      {replies.slice(0, max).map(
        (reply, index) => 
          <ReplyEntry user={reply.user.split("@")[0]} time={Math.floor(reply.ts) + "s"} content={reply.content} key={index} />
        )
      }
      {(replies.length > max) ? <p className="load" onClick={() => setMax(max + 5)}>Load more</p> : null}
    </div>
  )
}

const ReplyEntry = ({user, time, content}) => {
  return (
    <div className="reply_entry">
      <div className="reply_header">
        <p className="user">{user}</p>
        <p>-</p>
        <p className="post_time">{time}</p>
      </div>
      <div className="reply_content">
        <p>{content}</p>
      </div>
    </div>
  )
}

// main component
function Event() {
    return (
        <div>
          <Core />
        </div>
    );
}

export default Event;
