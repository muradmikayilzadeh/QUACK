/*
This is is a file that exports a the Homepage component. It is accessed by
the App.js file, to be rendered on empty route ("/").
*/

import React from "react";
import {useState, useEffect} from "react";
import "./HomePage.css";
import {useNavigate} from "react-router-dom";
import {apiUrl} from "../../../util/constants.js";
import homepageLogo from "../../imgs/quack_logo_homepage.png"


const Core = () => {
  // core scaffolding for app
  const nav = useNavigate();
  const [loginBool, setLoginBool] = useState(1);

  useEffect(() => {
    async function isLoggedIn() {
      const address = `${apiUrl}/check_login`;
      const response = await fetch(address, {
        method: "GET",
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "auth": localStorage.getItem("jwt"),
        }
      });
      const result = await response.json();
      console.log(result)
      return result
    }

    isLoggedIn().then(result => (result["logged_in"] == 0) ? null : nav('/Dashboard'))
  })

  return (
    <div className="core_wrapper">
      <div className="half1">
        <Info />
      </div>
      <div className="half2">
        <Login />
      </div>
    </div>
  )
}


const Info = () => {
  // contains links to different site features
  return (
    <div className="info_wrapper">
      <div className="event3_image">

          </div>
      <h1>The hub for campus events</h1>
      <div className="info_links">
        <div className="link"><a href="/Dashboard">Find events</a></div>
        <div className="link"><a href="/Map">Map view</a></div>
      </div>
    </div>
  )
}

const Login = ({setLoginBool}) => {
  const nav = useNavigate();

  // email and password vars
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [errors, setErrors] = useState([])

  // submission function, sends user + password to backend

  async function handleRegister() {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    const address = `${apiUrl}/login`;
    const response = await fetch(
        address,
        {
            method: "POST",
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: formData
        },
    );
    const result = await response.json();
    if (!response.ok) {
        // error handling
        setErrors(result["errors"])

        setTimeout(() => {
          setErrors([])
        }, 10000);

        return;
    }
    const token = result["jwt"];
    localStorage.setItem("jwt", token);
    console.log("saved jwt");
    return nav('/dashboard')
  }

  const onSubmit = () => {
    console.log("test")
    handleRegister()
  }

  return (
    <form className="login_container">
      <h1><img src={homepageLogo} width="300px" height="68px" /></h1>
      <div className="error_display">
        {errors.map(error => "* " + error)}
      </div>
      <div className="sign_in_form">
        <input type="email" placeholder="UO Email" onChange={event => setEmail(event.target.value)}/>
        <input type="password" placeholder="Password" onChange={event => setPassword(event.target.value)} onKeyDown={event => (event.key === "Enter") ? onSubmit() : null}/>
        <button onClick={() => onSubmit()} onTouchStart={() => onSubmit()} type="button">Sign in</button>
        <p className="bool"><a href="/Register">Create Account</a></p>
      </div>
    </form>
  )
}


// main component
function HomePage() {
    return (
        <div>
          <Core />
        </div>
    );
}

export default HomePage;
