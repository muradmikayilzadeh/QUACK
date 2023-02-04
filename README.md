# Quack

## Description
Quack is a social-media-like web app that allows University of Oregon students to find and share events hosted by other UO students and UO organizations.

## Authors
- Ben Backen  
- Turasul Bari  
- Turan Bulut  
- Stuart Hayes  
- Eliot Martin  
- Murad Mikayilzade

## README Updated
12/2/2022

## Course and Assignment
CS 422 (Fall 2022)  
Project 2

## Running the App
This project is containerized with Docker-Compose. To build and launch all of the services, cd into the root directory (quack) and run `docker-compose up`. The client interface will then be accessible at `http://localhost:3000`.

## Directory Structure

### client
The `client` directory holds all of the front-end code. Its `src` subdirectory contains all of the React components and CSS files.

### server

The `server` directory stores all of the back-end code. The Flask views are located in `server/app.py`.
