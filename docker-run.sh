docker build \
  --build-arg NODE_VERSION=8.9.0 \
  -t nortal/conference-radar:latest .

docker rm -vf conferenceRadarMongo
docker run -d --name conferenceRadarMongo mongo:latest

docker rm -vf conferenceRadar
docker run -d \
  -e ROOT_URL=http://example.com \
  -e MONGO_URL=mongodb://conferenceRadarMongo:27017/meteor \
  -e METEOR_SETTINGS="$(cat settings-development.json)" \
  -p 3000:3000 \
  --link conferenceRadarMongo \
  --name conferenceRadar \
  nortal/conference-radar:latest
