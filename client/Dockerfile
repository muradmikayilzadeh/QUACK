# base js node image
FROM node:alpine

# copy files into image
ADD . /var/www/html
WORKDIR /var/www/html

# update npm
RUN npm install -g npm@8.19.3
# update packages list
RUN npm install -g npm-check-updates
RUN ncu -u
# install packages
RUN npm config set unsafe-perm true
RUN npm install
# fix permission issues with node_modules and docker
RUN chown -R node /var/www/html
# add node_modules to path
ENV PATH="./node_modules/.bin:$PATH"
# build react app
RUN npm run build
USER node