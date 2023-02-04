import React from "react";
import {useState, useEffect} from "react";
import "./Register.css";
import {useNavigate} from "react-router-dom";
import {apiUrl} from "../../../util/constants.js";

const Core = () => {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [verifyKey, setVerifyKey] = useState("")
    const [showVerify, setShowVerify] = useState(0)
    
    const [errors, setErrors] = useState([])

    const nav = useNavigate();

    async function handleRegister() {
        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);

        const address = `${apiUrl}/register`;
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
            setErrors(result["errors"])

            setTimeout(() => {
                setErrors([])
            }, 10000);

            return;
        }
        const token = result["jwt"];
        localStorage.setItem("jwt", token);
        console.log("saved jwt");
        setShowVerify(1)
    }

    async function handleVerify() {
        const formData = new FormData();
        formData.append("jwt", localStorage.getItem("jwt"));
        formData.append("verify_key", verifyKey);

        const address = `${apiUrl}/verify`;
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
            setErrors(result["errors"])

            setTimeout(() => {
                setErrors([])
            }, 10000);
            
            return;
        }
        console.log("verified!")

        return nav('/Profile')
    }

    const onSubmit = () => {
        handleRegister()
    }

    const onVerify = () => {
        handleVerify()
        
    }

    if(showVerify === 0){
        return (
            <div className="register_core">
                <div className="register_wrapper">
                    <h1>Quack</h1>
                    <div className="register_errors">
                        {errors.map(error => "* " + error)}
                    </div>
                    <div className="inputs">
                        <input type="email" placeholder="UO E-mail" onChange={event => setEmail(event.target.value)}  />
                        <input type="password" placeholder="Password" onChange={event => setPassword(event.target.value)}  />
                        <Privacy />
                        <button onClick={() => onSubmit()} onTouchStart={() => onSubmit()} type="button">Sign up</button>
                    </div>
                </div>
            </div>
        )
    }
    else{
        return (
            <div className="register_core">
                <div className="register_wrapper">
                    <h1>Quack</h1>
                    <p className="notice">Check your UO E-mail</p>
                    <div className="register_errors">
                        {errors.map(error => "* " + error)}
                    </div>
                    <div className="inputs">
                        <div className="verify_wrap">
                            <input type="text" className="verify" placeholder="Verify code" onChange={event => setVerifyKey(event.target.value)} />
                        </div>
                        <button onClick={() => onVerify()} onTouchStart={() => onVerify()} type="button">Verify</button>
                    </div>
                </div>
            </div>
        )
    }
}

const Privacy = () => {
    const [toggle, setToggle] = useState(0)

    return (
        <div className="privacy">
            <div className={(toggle === 0) ? "priv" : ""} onClick={() => setToggle(0)}>Private</div>
            <div className={(toggle === 1) ? "priv" : ""} onClick={() => setToggle(1)}>Public</div>
        </div>
    )

}


function Register() {
    return (
        <div>
            <Core />
        </div>
    );
}

export default Register;