# Using Kubernetes Engine to Deploy Apps with Regional Persistent Disks

In this lab you will learn how to configure a highly available application by deploying WordPress using regional persistent disks on Kubernetes Engine. Regional persistent disks provide synchronous replication between two zones, which keeps your application up and running in case there is an outage or failure in a single zone. Deploying a Kubernetes Engine Cluster with regional persistent disks will make your application more stable, secure, and reliable.

Steps to complete this lab:


    Create a regional Kubernetes Engine cluster.

    Create a Kubernetes StorageClass resource that is configured for replicated zones.

    Deploy WordPress with a regional disk that uses the StorageClass.

    Simulate a zone failure by deleting a node.

    Verify that the WordPress app and data migrate successfully to another replicated zone.

Login to GCP console and start a cloud shell to start creating the kubernetes cluster.

#### Creating the Regional Kubernetes Engine Cluster

Begin by creating a regional Kubernetes Engine cluster that spans two zones in the `us-west1` region. First, fetch the server configuration for the `us-west1` region and export environment variables by running:

    CLUSTER_VERSION=$(gcloud beta container get-server-config --region us-west1 --format='value(validMasterVersions[0])')

    export CLOUDSDK_CONTAINER_USE_V1_API_CLIENT=false

Now create a standard Kubernetes Engine cluster (this will take a little while, ignore any warnings about node auto repairs):

    gcloud beta container clusters create repd \
    --cluster-version=${CLUSTER_VERSION} \
    --machine-type=n1-standard-4 \
    --region=us-west1 \
    --num-nodes=1 \
    --node-locations=us-west1-b,us-west1-c

You could the output as below,

    Creating cluster repd...done.
    Created [https://container.googleapis.com/v1beta1/projects/qwiklabs-gcp-e8f5f22705c770ab/zones/us-west1/clusters/repd].
    To inspect the contents of your cluster, go to: https://console.cloud.google.com/kubernetes/workload_/gcloud/us-west1/repd?project=qwiklabs-gcp-e8f5f22705c770ab
    kubeconfig entry generated for repd.
    NAME  LOCATION  MASTER_VERSION  MASTER_IP      MACHINE_TYPE   NODE_VERSION  NUM_NODES  STATUS
    repd  us-west1  1.10.2-gke.3    35.227.166.70  n1-standard-4  1.10.2-gke.3  2          RUNNING

You just created a regional cluster (located in `us-west1`) with one node in each zone (`us-west1-b`,`us-west1-c`). Navigate to Compute Engine in the left menu to see them.

The gcloud command has also automatically configured the kubectl command to connect to the cluster.

#### Deploying the App with a Regional Disk

Now that you have your Kubernetes cluster running, you'll do the following three things:

    Install Helm (a toolset for managing Kubernetes packages)

    Create the Kubernetes StorageClass that is used by the regional persistent disk

    Deploy WordPress

*Install and initialize Helm to install the chart package*

The chart package, which is installed with Helm, contains everything you need to run WordPress.

1) Install Helm locally in your Cloud Shell instance by running:

    curl https://raw.githubusercontent.com/kubernetes/helm/master/scripts/get > get_helm.sh
    chmod 700 get_helm.sh
    ./get_helm.sh

2) Initialize Helm:

    kubectl create serviceaccount tiller --namespace kube-system
    kubectl create clusterrolebinding tiller-cluster-rule \
    --clusterrole=cluster-admin \
    --serviceaccount=kube-system:tiller
    helm init --service-account=tiller
    until (helm version --tiller-connection-timeout=1 >/dev/null 2>&1); do echo "Waiting for tiller install..."; sleep 2; done && echo "Helm install complete"

Helm is now installed in your cluster.

### Create the StorageClass

Next you'll create the `StorageClass` used by the chart to define the zones of the regional disk. The zones listed in the `StorageClass` will match the zones of the Kubernetes Engine cluster.

Create a `StorageClass` for the regional disk by running:

    kubectl apply -f - <<EOF
    kind: StorageClass
    apiVersion: storage.k8s.io/v1
    metadata:
    name: repd-west1-b-c
    provisioner: kubernetes.io/gce-pd
    parameters:
    type: pd-standard
    replication-type: regional-pd
    zones: us-west1-b, us-west1-c
    EOF

You now have a StorageClass that is capable of provisioning PersistentVolumes that are replicated across the us-west1-b and us-west1-c zones.

List the available storageclass with:

    kubectl get storageclass
    NAME                 PROVISIONER            AGE
    repd-west1-b-c       kubernetes.io/gce-pd   26s
    standard (default)   kubernetes.io/gce-pd   1h

#### Deploy WordPress

Now that we have our StorageClass configured, Kubernetes automatically attaches the persistent disk to an appropriate node in one of the available zones.

1) Deploy the WordPress chart that is configured to use the `StorageClass` that you created earlier:

    helm install --name wp-repd \
    --set persistence.storageClass=repd-west1-b-c \
    stable/wordpress \
    --set mariadb.persistence.storageClass=repd-west1-b-c

2) List out available word-press pods:

    kubectl get pods
    NAME                                 READY     STATUS    RESTARTS   AGE
    wp-repd-mariadb-79444cd49b-lx8jq     1/1       Running   0          35m
    wp-repd-wordpress-7654c85b66-gz6nd   1/1       Running   0          35m  
3) Run the following command which waits for the service load balancer's external IP address to be created:

    while [[ -z $SERVICE_IP ]]; do SERVICE_IP=$(kubectl get svc wp-repd-wordpress -o jsonpath='{.status.loadBalancer.ingress[].ip}'); echo "Waiting for service external IP..."; sleep 2; done; echo http://$SERVICE_IP/admin

4) Verify that the persistent disk was created:

    while [[ -z $PV ]]; do PV=$(kubectl get pvc wp-repd-wordpress -o jsonpath='{.spec.volumeName}'); echo "Waiting for PV..."; sleep 2; done

    kubectl describe pv $PV

5) Get the URL for the WordPress admin page :

    echo http://$SERVICE_IP/admin

6) Click on the link to open WordPress in a new tab in your browser.

7) Back in Cloud Shell, get a username and password so you can log in to the app:

    cat - <<EOF
    Username: user
    Password: $(kubectl get secret --namespace default wp-repd-wordpress -o jsonpath="{.data.wordpress-password}" | base64 --decode)
    EOF

8) Go to the WordPress tab and log in with the username and password that was returned.

You now have a working deployment of WordPress that is backed by regional persistent disks in two zones.

#### Simulating a zone failure

Next you will simulate a zone failure and watch Kubernetes move your workload to the other zone and attach the regional disk to the new node.

1) Obtain the current node of the WordPress pod:

    NODE=$(kubectl get pods -l app=wp-repd-wordpress -o jsonpath='{.items..spec.nodeName}')

    ZONE=$(kubectl get node $NODE -o jsonpath="{.metadata.labels['failure-domain\.beta\.kubernetes\.io/zone']}")

    IG=$(gcloud compute instance-groups list --filter="name~gke-repd-default-pool zone:(${ZONE})" --format='value(name)')

    echo "Pod is currently on node ${NODE}"

    echo "Instance group to delete: ${IG} for zone: ${ZONE}"

Example Output:

    Pod is currently on node gke-repd-default-pool-b8cf37cd-bc5q
    Instance group to delete: gke-repd-default-pool-b8cf37cd-grp for zone: us-west1-c

You can also verify it with:

    kubectl get pods -l app=wp-repd-wordpress -o wide

Example Output:

    NAME                                 READY     STATUS    RESTARTS   AGE       IP           NODE
    wp-repd-wordpress-7654c85b66-gz6nd   1/1       Running   0          1h        10.20.0.11   gke-repd-default-pool-b8cf37cd-bc5q

Take note of `Node` column. You are going to delete this node to simulate the zone failure.

2) Now run the following to delete the instance group for the node where the WordPress pod is running, click Y to continue deleting:

    gcloud compute instance-groups managed delete ${IG} --zone ${ZONE}

Kubernetes is now detecting the failure and migrates the pod to a node in another zone.

3) Verify that both the WordPress pod and the persistent volume migrated to the node that is in the other zone:

    kubectl get pods -l app=wp-repd-wordpress -o wide

Example Output:

    NAME                                 READY     STATUS    RESTARTS   AGE       IP           NODE
    wp-repd-wordpress-7654c85b66-xqb78   1/1       Running   0          1m        10.20.1.14   gke-repd-default-pool-9da1b683-h70h

Make sure the node that is displayed is different from the node in the previous step.

4) Once the new service has a Running status, open the WordPress admin page in your browser from the link displayed in the command output:

    echo http://$SERVICE_IP/admin

You have attached a regional persistent disk to a node that is in a different zone.

