import React from "react";
import {useState, useEffect} from "react";
import "./Create.css";
import {apiUrl} from "../../../util/constants.js";
import Sidebar from "../../Sidebar.js"
import {useNavigate} from "react-router-dom";
import Icon from "../../imgs/dropdown.png"


const Core = () => {
    return (
        <div className="create_core core">
            <Sidebar />
            <div className="center_create">
                <CreateForm />
            </div>
        </div>
    )
}


const CreateForm = () => {
    const nav = useNavigate();
    // states for compiling request
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [location, setLocation] = useState("Pick a building")
    const [date, setDate] = useState("")
    const [start, setStart] = useState("")
    const [end, setEnd] = useState("")
    const [address, setAddress] = useState("")
    const [errors, setErrors] = useState([])
    const [img, setImg] = useState("")

    // post request function
    async function createRequest(event_data){
        const address = `${apiUrl}/create_event`;
        const response = await fetch(
            address,
            {
                method: "POST",
                headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "auth": localStorage.getItem("jwt"),
                },
                body: event_data,
            }
        );
        const result = await response.json()

        if(!response.ok){
            console.log(result)
            setErrors(result["errors"])

            setTimeout(() => {setErrors([])}, 10000)
            return
        }
        return nav('/dashboard')
    }

    console.log(errors)

    const handleSubmit = () => {

        let formData = new FormData()
        formData.append("name", name)
        formData.append("description", description)
        formData.append("location", location)
        formData.append("address", address)
        formData.append("date", date)
        formData.append("start", start)
        formData.append("end",  end)

        if(img != ""){
            formData.append("image", img)
        }

        // sends request, gets response, returns to dashboard
        createRequest(formData)
    }

    const handleImage = (image) => {
        console.log(image)

        if(image.type.includes("image")){
            setImg(image)   
        }
    }
    const [onCampus, setOnCampus] = useState(1)

    return (
        <div className="create_form">
            <h1>Create Event</h1>
            <div className="create_errors">
                {errors.map(error => <p>* {error}</p>)}
            </div>
            <div className="create_inputs">
                <input type="text" className="event_title" placeholder="Name your event..." onChange={event => setName(event.target.value)}/>
                <textarea placeholder="Describe your event..." rows="3" onChange={event => setDescription(event.target.value)}/ >
                <div className="oncampus_selector">
                    <button className={(onCampus === 1) ? "" : "unselected"} onClick={() => setOnCampus(1)}>On-campus</button>
                    <button className={(onCampus === 0) ? "" : "unselected"} onClick={() => setOnCampus(0)}>Off-campus</button>
                </div>
                {
                    (onCampus === 0) 
                    ?
                    <input type="text" placeholder="Where is it? (address)" onChange={event => {setLocation(event.target.value); setAddress(event.target.value)}} />
                    :
                    <div className="campus_loc">
                        <DropDown selected={location} setSelected={setLocation} setAddress={setAddress}/>
                        <input type="text" placeholder="Room #"/>
                    </div>
                }
                <div className="datetime">
                    <p>Image: </p>
                    <label>
                        <input type="file" onChange={event => handleImage(event.target.files[0])}/>
                        {(img === "") ? "Upload Image" : img.name}
                    </label>
                </div>
                <div className="datetime">
                    <p>Time: </p>
                    <div className="datetime">
                        <input type="time" onChange={event => setStart(event.target.value)}/>
                        <input type="time" onChange={event => setEnd(event.target.value)}/>
                    </div>
                </div>
                <div className="datetime">
                    <p>Date: </p>
                    <input type="date" onChange={event => setDate(event.target.value)}/>
                </div>
            </div>
            <button type="button" onClick={() => handleSubmit()}>Quack it</button>
        </div>
    )
}

const DropDown = ({selected, setSelected, setAddress}) => {
    const [display, setDisplay] = useState(0);

    let items = ["EMU", "Knight Library", "JS Art Museum", "Autzen Stadium", 
    "Law Library", "Price Science Commons"]

    let addresses = 
        ["1395 University St, Eugene, OR 97403", 
        "1501 Kincaid St, Eugene, OR 97403",
        "1430 Johnson Lane, Eugene, OR 97403",
        "2700 Martin Luther King Jr Blvd, Eugene, OR 97401",
        "1515 Agate St, Eugene, OR 97403",
        "1344 Franklin Blvd, Eugene, OR 97403"
        ] 


    const onDropClick = (item, key) => {
        setAddress(addresses[key])
        setSelected(item)
        setDisplay(0)
    }

    return (
        <div className="dropdown_wrapper">
            <div className="dropdown">
                <div className="selected" onClick={() => setDisplay((display) ? 0 : 1)}>{selected} <img src={Icon}/></div>
                <div className={(display) ? "dropdown_menu" : "dropdown_menu off"}>
                    {items.map((item, key) => <div className="dropdown_item" key={key} onClick={() => onDropClick(item, key)}>{item}</div>)}
                </div>
            </div>
        </div>
    )
}

function Create() {
    return (
        <div>
            <Core />
        </div>
    );
}

export default Create;