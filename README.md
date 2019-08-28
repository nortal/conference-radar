# Tech-radar v2

## Development setup

1. Install packages 
        
        npm install

2. Build the image 
    
        docker build \
          --build-arg NODE_VERSION=8.9.0 \
          -t nortal/conference-radar:latest .

3. Run a mongoDb instance 
    
        docker run -d --name conferenceRadarMongo mongo:latest

4. Run the instance

       docker run -d \
         -e ROOT_URL=http://example.com \
         -e MONGO_URL=mongodb://conferenceRadarMongo:27017/meteor \
         -e METEOR_SETTINGS="$(cat settings-development.json)" \
         -p 3000:3000 \
         --link conferenceRadarMongo \
         nortal/conference-radar:latest

5. Open the browser on http://localhost:3000

Adjust parameters according to use. 

## Auth setup

### Facebook
        
[Documentation](https://developers.facebook.com/docs/facebook-login/web)
1. Create facebook app [here](https://developers.facebook.com/apps/) (requires developer account)
2. Add login functionality
3. Grab app ID and API version, update app's settings json

### Google
        
[Documentation](https://developers.google.com/identity/sign-in/web/sign-in)
1. Create Google API Console project [here](https://console.developers.google.com) and configure it for sign in
3. Grab app client ID, update app's settings json
