if [ -z "$1" ]
then
  echo "No remote host provided!"
  exit 1
fi

remote=$1

echo "==========================================="
echo "REMOVE OLD ARCHIVE AND DOCKER IMAGE"
echo "==========================================="
rm dist/techradar-buildstuff.tar
docker rm -vf techradar-buildstuff
docker rmi -f nortal/techradar-buildstuff

echo "==========================================="
echo "CREATE DOCKER IMAGE"
echo "==========================================="
docker build \
  --build-arg NODE_VERSION=8.9.0 \
  -t nortal/techradar-buildstuff:latest .

echo "==========================================="
echo "CREATE NEW DOCKER IMAGE ARCHIVE"
echo "==========================================="
mkdir -p dist
docker save nortal/techradar-buildstuff:latest > dist/techradar-buildstuff.tar

echo "==========================================="
echo "COPY ARCHIVE AND SETTINGS TO REMOTE HOST"
echo "==========================================="
scp -r dist/techradar-buildstuff.tar settings-buildstuff.json ${remote}:/tmp/

echo "==========================================="
echo "RUN DOCKER IMAGE ON REMOTE HOST"
echo "==========================================="
ssh ${remote} << EOF
  cd /tmp
  docker rmi -f nortal/techradar-buildstuff
  docker load < /tmp/techradar-buildstuff.tar

  for i in {0..1}
  do
    docker rm -vf techradar-buildstuff-\$i
    docker run -d \
      -e ROOT_URL=https://buildstuff.nortal.com \
      -e MONGO_URL=mongodb://localhost:27017/buildstuff \
      -e METEOR_SETTINGS="\$(cat settings-buildstuff.json)" \
      -e PORT=302\$i \
      --network="host" \
      --name techradar-buildstuff-\$i \
      --restart always \
      nortal/techradar-buildstuff:latest
  done
EOF
