if [ -z "$1" ]
then
  echo "No remote host provided!"
  exit 1
fi

remote=$1

echo "==========================================="
echo "REMOVE OLD ARCHIVE AND DOCKER IMAGE"
echo "==========================================="
rm dist/techradar.tar
docker rm -vf techradar
docker rmi -f nortal/techradar

echo "==========================================="
echo "CREATE DOCKER IMAGE"
echo "==========================================="
docker build \
  --build-arg NODE_VERSION=8.9.0 \
  -t nortal/techradar:latest .

echo "==========================================="
echo "CREATE NEW DOCKER IMAGE ARCHIVE"
echo "==========================================="
mkdir -p dist
docker save nortal/techradar:latest > dist/techradar.tar

echo "==========================================="
echo "COPY ARCHIVE AND SETTINGS TO REMOTE HOST"
echo "==========================================="
scp -r dist/techradar.tar settings-techradar.json ${remote}:/tmp/

echo "==========================================="
echo "RUN DOCKER IMAGE ON REMOTE HOST"
echo "==========================================="
ssh ${remote} << EOF
  cd /tmp
  docker rmi -f nortal/techradar
  docker load < /tmp/techradar.tar

  for i in {0..3}
  do
    docker rm -vf techradar-\$i
    docker run -d \
      -e ROOT_URL=https://techradar.nortal.com \
      -e MONGO_URL=mongodb://localhost:27017/techradar \
      -e METEOR_SETTINGS="\$(cat settings-techradar.json)" \
      -e PORT=300\$i \
      --network="host" \
      --name techradar-\$i \
      --restart always \
      nortal/techradar:latest
  done
EOF
