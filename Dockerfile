FROM mhart/alpine-node:4

WORKDIR /src
COPY ./index.js ./
COPY ./package.json ./
COPY ./nginx.conf.sigil ./

RUN npm install
EXPOSE 80
CMD ["npm", "start"]