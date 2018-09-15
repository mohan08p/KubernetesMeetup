# Sample RSVP APP

This is a sample RSVP app which is having a frontend and a backend where frontend is using the Python Flask framework and backend is storing the data into MongoDB database.

The original application is build by the CloudYuga team. I am only passing the environment variables at runtime to frontend deployment to get the reflected values on the frontend page.

Use the following commands to create deployment and service for the mongo and flask application.

Pass the argument if you want to track the deployment using `--record=true`
   
    $ kubectl create -f mongo/
    $ kubectl create -f flask-front-end/

Then you can list the services running in your cluster using,

    $ kubectl get services
  
It will show the flask front end service is exposed on Node port and it is mapped to random port in the range(30000-32767) as we have not specified in the service configuration file.

Check the container logs running inside the pod using kubectl,

    $ kubectl logs pod-name

Also, get a shell inside the container pod running mongo,

    $ kubectl exec -it mongo-pod-name -- /bin/bash

Then you can check the collection inside the MongoDB and see the documents created for the RSVP entries from the front-end application. This is only for validation and helps in debugging. 
