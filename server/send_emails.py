####################
# Imports
####################

import smtplib
import configparser
import os

####################
# Initialize
####################

# parse config
config = configparser.ConfigParser()
config.read(os.path.join("config", "config.ini"))

# auth
SENDER = config["EMAIL"]["SENDER"]
PASSWORD = config["EMAIL"]["PASSWORD"]

####################
# Functions
####################

def send_email(to_address: str, subject: str, body: str) -> bool:
    """
    Sends an email to the address from our Quack email.
    NOTE emails often show up in junk inbox.
    Params:
        to_address: address to send email to
        subject:    email subject
        body:       email body
    Returns:
        success:    True if successful sent, otherwise False
    """
    try:
        session = smtplib.SMTP('smtp.gmail.com', 587)
        session.starttls()
        session.login(SENDER, PASSWORD)
        message = f"Subject: {subject}\n\n{body}"
        session.sendmail(SENDER, to_address, message)
        session.quit()
    except:
        return False
    
    return True
