import React from "react";
import {useState, useEffect} from "react";
import "./Map.css";
import Sidebar from "../../Sidebar.js"
import {useNavigate} from "react-router-dom";

import {MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useMap } from 'react-leaflet/hooks'
import {apiUrl} from "../../../util/constants.js";


import Location from "../../imgs/location.svg"
import Clock from "../../imgs/clock.svg"
import Calendar from "../../imgs/calendar.svg"

const Core = () => {
    return (
      <div className="core">
        <Sidebar />
        <MapView />
      </div>
    )
}

const ChangeView = ({center}) => {
    const map = useMap();
    map.flyTo(center, 15);
}

const MapView = () => {
    const [entries, setEntries] = useState([]);

    const [center, setCenter] = useState([44.0448, -123.0726]);
    const [zoom, setZoom] = useState(15)
    const [address, setAddress] = useState("")

    let cur = new Date()
    const [start, setStart] = useState(cur.getFullYear() + "-" + (cur.getMonth() + 1) + "-" + cur.getDate())
    const [end, setEnd] = useState("")

    let preset_locations = [
        {
            name:"EMU",
            position:[44.0450366,-123.0737062],
            address: "1395 University St, Eugene, OR 97403"
        },
        {
            name:"Knight Library",
            position:[44.0431005,-123.07777864605808],
            address: "1501 Kincaid St, Eugene, OR 97403"
        },
        {
            name: "JS Art Museum",
            position:[44.044270,-123.077225],
            address: "1430 Johnson Lane, Eugene, OR 97403"  
        },
        {
            name:"Autzen Stadium",
            position:[44.058459, -123.068468],
            address: "2700 Martin Luther King Jr Blvd, Eugene, OR 97401"
        },
        {
            name: "Law Library",
            position: [44.042589,-123.069170],
            address: "1515 Agate St, Eugene, OR 97403"
        },
        {
            name: "Price Science Commons",
            position: [44.046306,-123.073057],
            address: "1344 Franklin Blvd, Eugene, OR 97403"
        }
    ]

    const handleClick = (pos) => {
        setCenter(pos);
    }

    const searchAddress = () => {
        const Nominatim = require('nominatim-geocoder');
        const geocoder = new Nominatim()

        geocoder.search( { q: address} )
        .then((response) => {
            console.log(response)
            let lat = response[0].lat
            let long = response[0].lon
            setCenter([lat, long])
        })
        .catch((error) => {
            console.log(error)
        })
    }

    return (
        <div className="map">
            <MapContainer center={center} zoom={15} scrollWheelZoom={true} minZoom={13}>
                
                <DateFilter start={start} setStart={setStart} setEnd={setEnd} />
                <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                />
                <ChangeView center={center} zoom={zoom}/>
                {preset_locations.map((loc, index) => 
                    <MapLocation pos={loc.position} 
                        name={loc.name}
                        address={loc.address}
                        setEntries={setEntries}
                        start={start}
                        end={end}
                        key={index}
                    />
                )}
            </MapContainer>
            
            {
                (entries.length > 0) ?
                <div className="map_info">
                    <h1>Events</h1>
                    <EventDisplay events={entries}/>
                </div>
                :
                null
            }
        </div>
    )
}

const DateFilter = ({start, setStart, setEnd}) => {
    // Date filter component, allows user to select start/end date
  
    return (
        <div className="date_filter">
            <input type="date" defaultValue={start} onChange={e => {setStart(e.target.value)}}/>
            |
            <input type="date" onChange={e => {setEnd(e.target.value)}}/>
        </div>
    )
}

const MapLocation = ({pos, name, address, start, end, setEntries}) => {

    const handleClick = () => {
        // will make a sidebar with location-specific event info pop up\

        // get all events at location 'name'

        async function getEvents() {
            let formData = new FormData()
            formData.append('location', name)
            formData.append('start', start)
            formData.append('end', end)

            const address = `${apiUrl}/map_events`;
            const response = await fetch(address, {
                method: "POST",
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "auth": localStorage.getItem("jwt"),
                },
                body: formData
            });
            const result = await response.json()
            console.log(result)
            return result
        }

        getEvents().then(result => setEntries(result["events"]))
    }

    return (
        <Marker position={pos}>
            <Popup>
                <p className="marker_header">{name}</p>
                <p className="google_link"><a href={'https://www.google.com/maps?q=' + address}>Google Maps</a></p>
                <p onClick={() => handleClick()} className="loc_info">Click for info</p>
            </Popup>
        </Marker>
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

function Map() {
    return (
        <div>
          <Core />
        </div>
    );
}

export default Map;
