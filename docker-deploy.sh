if [ -z "$1" ]
then
  echo "No remote host provided!"
  exit 1
fi

remote=$1

echo "============================="
echo "REMOVE OLD ARCHIVES"
echo "============================="
rm conferenceRadar.tar conferenceRadarMongo.tar


echo "============================="
echo "REMOVE OLD DOCKER IMAGES"
echo "============================="
docker rm -vf conferenceRadar conferenceRadarMongo
docker rmi -f nortal/conference-radar mongo


echo "========================================"
echo "CREATE METEOR AND MONGO DOCKER IMAGES"
echo "========================================"
docker build \
  --build-arg NODE_VERSION=8.9.0 \
  -t nortal/conference-radar:latest .
docker run -d --name conferenceRadarMongo mongo:latest
docker stop conferenceRadarMongo


echo "========================================"
echo "CREATE DOCKER NEW IMAGE ARCHIVES"
echo "========================================"
docker save nortal/conference-radar:latest > conferenceRadar.tar
docker save mongo:latest > conferenceRadarMongo.tar


echo "========================================"
echo "COPY ARCHIVES TO REMOTE"
echo "========================================"
scp -r conferenceRadar.tar conferenceRadarMongo.tar settings-development.json ${remote}:/tmp/


echo "========================================"
echo "RUN DOCKER IMAGES IN REMOTE"
echo "========================================"
ssh ${remote} << EOF
  cd /tmp
  docker rm -vf conferenceRadar conferenceRadarMongo
  docker rmi -f nortal/conference-radar mongo

  docker load < /tmp/conferenceRadar.tar
  docker load < /tmp/conferenceRadarMongo.tar

  docker run -d --name conferenceRadarMongo mongo:latest
  sleep 5
  docker run -d \
    -e ROOT_URL=http://example.com \
    -e MONGO_URL=mongodb://conferenceRadarMongo:27017/meteor \
    -e METEOR_SETTINGS="\$(cat settings-development.json)" \
    -p 3000:3000 \
    --link conferenceRadarMongo \
    --name conferenceRadar \
    nortal/conference-radar:latest
EOF
