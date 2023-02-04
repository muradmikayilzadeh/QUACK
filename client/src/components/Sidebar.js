import React from "react";
import {useState, useEffect} from "react";
import "./Sidebar.css";
import {useNavigate} from "react-router-dom";
import menu_svg from "./imgs/menu_svg.svg"
import sidebarLogo from "./imgs/quack_logo_sidebar2.png"
import {apiUrl} from "./../util/constants.js";

const Sidebar = () => {
  // navigation to other parts of app (departments, clubs, etc.)
  // left column
  // on mobile, turn into a horizontal navbar that is expandable
  const [sideVis, setSideVis] = useState(0);
  const [logged, setLogged] = useState(1)
  const nav = useNavigate();

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

    isLoggedIn().then(result => setLogged(result["logged_in"]))
  })

  const signOut = () => {
    localStorage.setItem("jwt", null)
    console.log(localStorage.getItem('jwt'))
    return nav('/')
  }

  return (
    <div>
      <div className="horizontal_bar">
        <div className="nav_button" onClick={() => (sideVis) ? setSideVis(0) : setSideVis(1)}><img src={menu_svg} width="32px" height="32px" fill="white"/></div>
        <div className="flex_center">
          <h1><a href={(logged) ? "/Dashboard" : "/"}><img src={sidebarLogo} width="50px" height="50px" /></a></h1>
        </div>
      </div>
      <div className={(sideVis) ? "sidebar_wrapper sidebar_visible" : "sidebar_wrapper"}>
        <h1><a href={(logged) ? "/Dashboard" : "/"}><img src={sidebarLogo} width="40px" height="40px" /></a></h1>
        <ul>
          {(logged) ? <li><a href="/Profile">Profile</a></li> : null}
          <li><a href="/Dashboard">Dashboard</a></li>
          {(logged) ? <li><a href="/Create">Create Event</a></li> : null}
          <li><a href="/Map">Map view</a></li>
          {(logged) ? null : <li><a href="/">Sign in</a></li>}
          {(logged) ? null : <li><a href="/Register">Register</a></li>}
          {(logged === 0) ? null : <li onClick={() => signOut()}>Sign out</li>}
          
        </ul>
      </div>
      <div className="sidebar_back"></div>
    </div>
  )
}


export default Sidebar;
