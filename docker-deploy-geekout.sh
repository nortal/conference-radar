if [ -z "$1" ]
then
  echo "No remote host provided!"
  exit 1
fi

remote=$1

echo "==========================================="
echo "REMOVE OLD ARCHIVE AND DOCKER IMAGE"
echo "==========================================="
rm dist/techradar-geekout.tar
docker rm -vf techradar-geekout
docker rmi -f nortal/techradar-geekout

echo "==========================================="
echo "CREATE DOCKER IMAGE"
echo "==========================================="
docker build \
  --build-arg NODE_VERSION=8.9.0 \
  -t nortal/techradar-geekout:latest .

echo "==========================================="
echo "CREATE NEW DOCKER IMAGE ARCHIVE"
echo "==========================================="
mkdir -p dist
docker save nortal/techradar-geekout:latest > dist/techradar-geekout.tar

echo "==========================================="
echo "COPY ARCHIVE AND SETTINGS TO REMOTE HOST"
echo "==========================================="
scp -r dist/techradar-geekout.tar settings-geekout.json ${remote}:/tmp/

echo "==========================================="
echo "RUN DOCKER IMAGE ON REMOTE HOST"
echo "==========================================="
ssh ${remote} << EOF
  cd /tmp
  docker rmi -f nortal/techradar-geekout
  docker load < /tmp/techradar-geekout.tar

  for i in {0..1}
  do
    docker rm -vf techradar-geekout-\$i
    docker run -d \
      -e ROOT_URL=https://geekout.nortal.com \
      -e MONGO_URL=mongodb://localhost:27017/geekout \
      -e METEOR_SETTINGS="\$(cat settings-geekout.json)" \
      -e PORT=301\$i \
      --network="host" \
      --name techradar-geekout-\$i \
      nortal/techradar-geekout:latest
  done
EOF
