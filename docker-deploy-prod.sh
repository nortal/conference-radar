if [ -z "$1" ]
then
  echo "No remote host provided!"
  exit 1
fi

remote=$1

echo "==========================================="
echo "REMOVE OLD ARCHIVE AND DOCKER IMAGE"
echo "==========================================="
rm conferenceRadar.tar
docker rm -vf conferenceRadar
docker rmi -f nortal/conference-radar

echo "==========================================="
echo "CREATE DOCKER IMAGE"
echo "==========================================="
docker build \
  --build-arg NODE_VERSION=8.9.0 \
  -t nortal/conference-radar:latest .

echo "==========================================="
echo "CREATE NEW DOCKER IMAGE ARCHIVE"
echo "==========================================="
docker save nortal/conference-radar:latest > conferenceRadar.tar

echo "==========================================="
echo "COPY ARCHIVE AND SETTINGS TO REMOTE HOST"
echo "==========================================="
scp -r conferenceRadar.tar settings-development.json ${remote}:/tmp/

echo "==========================================="
echo "RUN DOCKER IMAGE ON REMOTE HOST"
echo "==========================================="
ssh ${remote} << EOF
  cd /tmp
  docker rmi -f nortal/conference-radar
  docker load < /tmp/conferenceRadar.tar

  for i in {0..3}
  do
    docker rm -vf conferenceRadar\$i
    docker run -d \
      -e ROOT_URL=https://techradar.nortal.com \
      -e MONGO_URL=mongodb://localhost:27017/meteor \
      -e METEOR_SETTINGS="\$(cat settings-development.json)" \
      -e PORT=300\$i \
      --network="host" \
      --name conferenceRadar\$i \
      nortal/conference-radar:latest
  done
EOF
