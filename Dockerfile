FROM mhart/alpine-node:4

WORKDIR /src
COPY ./index.js ./
COPY ./package.json ./
COPY ./nginx.conf.sigil ./

ENV PORT 80
ENV NODE_ENV production

RUN npm install
EXPOSE 80
CMD ["npm", "start"]