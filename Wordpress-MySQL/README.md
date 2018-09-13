# Deploy Wordpress and MySQL On Kubernetes Using NFS Server

Deploy Wordpress and MySQL database using K8s. Both applications use Persistent Volumes(PV) and Persistent Volume Claims(PVC) to store data.

Steps:
    1) Create Persistent Volume Claims and Persistent Volumes
    2) Create a Secret for MySQL.
    3) Deploy MySQL and Wordpress respectively.

Use NFS server to store the Wordpress and MySQL data. Open the ports TCP:111, UDP: 111, TCP:2049, UDP:2049

    $ sudo yum install nfs-utils -y

Now we will share the NFS directory over the private subnet of Kubernetes:

    $ sudo vi /etc/exports
    / 172.31.32.0/24(rw,sync,no_root_squash)

You need to change “172.31.32.0/24” to your private cluster subnet.

Create a backup directory for mysql & wordpress files for volumes:

    $ sudo mkdir /{mysql,html}
    $ sudo chmod -R 755 /{mysql,html}
    $ sudo chown nfsnobody:nfsnobody /{mysql,html}
    $ sudo systemctl enable rpcbind ; $ sudo systemctl enable nfs-server
    $ sudo systemctl enable nfs-lock ; $ sudo systemctl enable nfs-idmap
    $ sudo systemctl start rpcbind ; $ sudo systemctl start nfs-server
    $ sudo systemctl start nfs-lock ; $ sudo systemctl start nfs-idmap

#### Create a Secret for MySQL Password

We're using the default password as admin and encrypting it. You can use your database password rather then the default one. 

    $ echo -n 'admin' | base64

You will get the encoded password: YWRtaW4=

Create a `secret.yml` file for MySQL and Wordpress that will be mapped as an Environment Variable. Use the encoded password inside your secret file and create a secret using,

    $ kubectl create -f secrets/secret.yml

Then create a Persistent Volume for Wordpress and MySQL. 

#### Deploy PersistentVolumes

Create a PV file `pv-wordpress-mysql.yml` and change the IP address of the NFS server you are using. 

Now run the following command to create a PV:

    $ kubectl create -f PersistentVolumes/pv-wordpress-mysql.yml

#### Deploy PersistentVolumeClaim(PVC)

PVC is a request for storage that can at some point become available, bound to some actual PV.

Create the respective file for wordpress and mysql as `pvc-wordpress.yml` and `pvc-mysql.yml`

Then run the following commands for creating them,

    $ kubectl create -f pvc-wordpress.yml
    $ kubectl create -f pvc-mysql.yml

#### Deploy MySQL

Create a file `mysql-deploy.yml` for for MySQL service and deployment.

The file consists of 2 separate configs:

The `Service` part maps MySQL’s port 3306 and makes it available for all containers with the labels app:wordpress & tier:mysql.

The `Deployment` part declares the creation strategy and specs of our MySQL container:

Now create the deployment and service:

    $ kubectl create -f mysql-deploy.yml

#### Deploy Wordpress

Create a file `wordpress-deploy.yml`

Again, the file consists of two configs:

`Service` maps port 80 of the container to the node’s external IP:Port for all containers with the labels app:wordpress & tier:frontend

`Deployment` declares the creation spec of our WordPress container.

Then create using the command,

    $ kubectl create -f wordpress-deploy.yml

#### Launch WordPress

To access WordPress list the services and navigate to the External IP:Port , in my case the service is running on port 30080 that would be EXTERNAL_IP:30080.

Then finally you ccan set-up the blog and write your blogs using this framework which is running on kubernetes. Happy K8s blogging. 