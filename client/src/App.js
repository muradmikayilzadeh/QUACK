////////////////////
// Imports
////////////////////

import React from "react";
// import axios from 'axios';
import {useState, useEffect} from "react";
import {apiUrl} from "./util/constants.js";
import {BrowserRouter as Router, Route, Routes} from "react-router-dom";
import HomePage from "./components/pages/HomePage/HomePage.js";
import Dashboard from "./components/pages/Dashboard/Dashboard.js";
import Create from "./components/pages/Create/Create.js";
import Event from "./components/pages/SingleEvent/Event.js";
import Map from "./components/pages/Map/Map.js"
import Profile from "./components/pages/Profile/Profile.js"
import Register from "./components/pages/Register/Register.js"

import "./App.css";



function App() {
    return (
    <div className="app">
        <Router>
            <Routes>
                <Route exact path="/" element={<HomePage />} />
                <Route exact path="/Dashboard" element={<Dashboard />} />
                <Route exact path="/Create" element={<Create />} />
                <Route exact path="/Event" element={<Event />} />
                <Route exact path="/Map" element={<Map />} />
                <Route exact path="/Profile" element={<Profile />} />
                <Route exact path="/Register" element={<Register />}/>
            </Routes>
        </Router>
    </div>
  );
}

export default App;

