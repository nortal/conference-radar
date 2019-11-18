if [ -z "$1" ]
then
  echo "No remote host provided!"
  exit 1
fi

remote=$1

echo "============================="
echo "REMOVE OLD ARCHIVES"
echo "============================="
rm dist/techradar-development.tar dist/mongo-techradar.tar


echo "============================="
echo "REMOVE OLD DOCKER IMAGES"
echo "============================="
docker rm -vf techradar-development mongo-techradar
docker rmi -f nortal/techradar-development mongo


echo "========================================"
echo "CREATE METEOR AND MONGO DOCKER IMAGES"
echo "========================================"
docker build \
  --build-arg NODE_VERSION=8.9.0 \
  -t nortal/techradar-development:latest .
docker run -d --name mongo-techradar mongo:latest
docker stop mongo-techradar


echo "========================================"
echo "CREATE DOCKER NEW IMAGE ARCHIVES"
echo "========================================"
docker save nortal/techradar-development:latest > dist/techradar-development.tar
docker save mongo:latest > dist/mongo-techradar.tar


echo "========================================"
echo "COPY ARCHIVES TO REMOTE"
echo "========================================"
scp -r dist/techradar-development.tar dist/mongo-techradar.tar settings-development.json ${remote}:/tmp/


echo "========================================"
echo "RUN DOCKER IMAGES IN REMOTE"
echo "========================================"
ssh ${remote} << EOF
  cd /tmp
  docker rm -vf techradar-development mongo-techradar
  docker rmi -f nortal/techradar-development mongo

  docker load < /tmp/techradar-development.tar
  docker load < /tmp/mongo-techradar.tar

  docker run -d --name mongo-techradar mongo:latest
  sleep 5
  docker run -d \
    -e ROOT_URL=http://example.com \
    -e MONGO_URL=mongodb://mongo-techradar:27017/techradar \
    -e METEOR_SETTINGS="\$(cat settings-development.json)" \
    -p 3000:3000 \
    --link mongo-techradar \
    --name techradar-development \
    --restart always \
    nortal/techradar-development:latest
EOF
