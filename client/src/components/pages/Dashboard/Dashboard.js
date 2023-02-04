
import React from "react";
import {useState, useEffect} from "react";
import "./Dashboard.css";
import Sidebar from "../../Sidebar.js"
import {useNavigate} from "react-router-dom";
import Location from "../../imgs/location.svg"
import Clock from "../../imgs/clock.svg"
import Calendar from "../../imgs/calendar.svg"
import ThumbsUp from "../../imgs/thumbs_up.png"
import PostIt from "../../imgs/postit.png"
import CommentSign from "../../imgs/comment.png"

import {apiUrl} from "../../../util/constants.js";

const Core = () => {
  const [mobileDisplay, setMobileDisplay] = useState(0)
  const [entries, setEntries] = useState([])

  console.log(entries)

  async function getEvents(start, end) {
    let formData = new FormData();
    formData.append("start", start)
    formData.append("end", end)

    const address = `${apiUrl}/get_events`;
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
    return result["events"]
  }

  const handleEvents = (start, end) => {
    getEvents(start, end).then(result => setEntries(result.sort((a, b) => b.like_count - a.like_count))).catch(err => console.log(err))
  }

  return (
    <div className="core">
      <Sidebar />
      <MobileSelect handleEvents={handleEvents} mobileDisplay={mobileDisplay} setMobileDisplay={setMobileDisplay}/>
      <EventBoard handleEvents={handleEvents} entries={entries} mobileDisplay={mobileDisplay}/>
      <InteractFeed mobileDisplay={mobileDisplay}/>
    </div>
  )
}


const MobileSelect = ({mobileDisplay, setMobileDisplay, handleEvents}) => {
  // will be used to select dashboard or feed,
  // not visible on desktop

  const [toggle, setToggle] = useState(0)

  return (
    <div className="mobile_select">
      <div className="views">
        <button onClick={() => setMobileDisplay(0)} className={(mobileDisplay === 0) ? "mobile_s" : ""}>Dashboard</button>
        <button onClick={() => setMobileDisplay(1)} className={(mobileDisplay === 1) ? "mobile_s" : ""}>Feed</button>
      </div>
      <p onClick={() => (toggle) ? setToggle(0) : setToggle(1)}>Filter</p>
      <div className={(toggle == 0) ? "mobile_filter" : "mobile_filter on"} >
        <DateFilter handleEvents={handleEvents}/>
      </div>
    </div>
  )
}


const InteractFeed = ({mobileDisplay}) => {
  // list of user interactions (likes, comments, posts)

  const [max, setMax] = useState(10)

  let feed_list =  new Array(10).fill(
    {
      user:"stuarth",
      action:"liked",
      event_title:"Weekly Club Meeting",
      time:"1s"
    }
  )

  const [feedEntries, setFeedEntries] = useState([])

  useEffect(() => {
    async function getFeed() {
      const address = `${apiUrl}/get_feed`;
      const response = await fetch(address, {
        method: "GET",
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "auth": localStorage.getItem("jwt"),
        },
      });
      const result = await response.json();
      console.log(result)
      return result["interactions"]
    }

    getFeed().then(result => setFeedEntries(result.sort((a, b) => a.ts - b.ts)))
  }, [])

  return (
    <div className={(mobileDisplay === 0) ? "feed_wrapper off" : "feed_wrapper"}>
      <h1>Feed</h1>
      <div className="list_wrapper">
        {feedEntries.slice(0, max).map((entry, index) => 
          <FeedEntry 
            title={entry.event}
            key={index} 
            user={entry.user.split("@")[0]}
            action={entry.action}
            event_id={entry.event_id}
            time={Math.floor(entry.ts) + "s"}
          />
        )}
        <p className="load" onClick={() => setMax(max + 10)}>Load more</p>
      </div>
    </div>
  )
}

const FeedEntry = ({title, user, action, time, event_id}) => {
  // a single entry into the feed list

  let icon = ThumbsUp;
  if(action === "liked"){
    icon = ThumbsUp
  }
  else if(action === "commented"){
    icon = CommentSign
  }
  else{
    icon = PostIt
  }

  return (
    <div className="feed_entry">
      <div className="icon_wrap">
        <img src={icon} />
      </div>
      <div className="feed_content">
        <p className="feed_title"><a href={"/Event?id=" + event_id}>{title}</a></p>
        <p className="user_action"><a href="/Profile">{user}</a> <span>{action}</span></p>
        <p className="time">{time} ago</p>
      </div>
    </div>
  )
}

const EventBoard = ({mobileDisplay, entries, handleEvents}) => {
  const [max, setMax] = useState(8)

  let cur = new Date()

  useEffect(() => {
      handleEvents(cur.getFullYear() + "-" + (cur.getMonth() + 1) + "-" + cur.getDate(), "")
    }, []
  )

  return (
    <div className={(mobileDisplay === 0) ? "event_board" : "event_board off"}>
      <DashboardHeader handleEvents={handleEvents}/>
      <div className="entries">
        {
          // this automatically generates entries for all in list
          entries.slice(0, max).map(
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
            />
          )
        }
        <p className="load" onClick={() => setMax(max + 8)}>Click to load more</p>
      </div>
    </div>
  )
}

const DashboardHeader = ({handleEvents}) => {
  // Contains header text and Date Filter
  return (
    <div className="dash_head">
      <h1>Dashboard</h1>
      <DateFilter handleEvents={handleEvents}/>
    </div>
  )
}

const DateFilter = ({handleEvents}) => {
  // Date filter component, allows user to select start/end date
  let cur = new Date()
  const [start, setStart] = useState(cur.getFullYear() + "-" + (cur.getMonth() + 1) + "-" + cur.getDate())
  const [end, setEnd] = useState("")

  return (
    <div className="date_filter">
      <input type="date" defaultValue={start} onChange={e => {setStart(e.target.value); handleEvents(e.target.value, end)}}/>
      |
      <input type="date" onChange={e => {setEnd(e.target.value); handleEvents(start, e.target.value)}}/>
    </div>
  )
}

const EventEntry = ({title, submitter, start, end, date, location, event_id, image}) => {
  // an individual entry used by EventBoard

  // to do, reformatting & styling

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
    <div className="entry_div">
      <div className="entry_img">
        <img src={`${apiUrl}/get_image/${event_id}/${image}`} />
      </div>
      <div className="entry_info">
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
// main component
function Dashboard() {
    return (
        <div>
          <Core />
        </div>
    );
}

export default Dashboard;