# Kubernetes Bluemix Demo

### Getting started with clusters

Kubernetes is an orchestration tool for scheduling app containers onto a cluster of compute machines. With Kubernetes, developers can rapidly develop highly available applications by using the power and flexibility of containers.

Before you deply apps by using kubernetes, start by creating a cluster. A cluster is a set of worker nodes that are organized into a network. The purpose of the cluster is to define a set of resources, nodes, networks, and storage devices that keep applications highly available.

But, prior to creating a cluster using the CLI we need to install [Bluemix CLI](https://console.bluemix.net/docs//containers/cs_cli_install.html#cs_cli_install) which will take care of kubernetes cluster creation, deletion, etc.

 To install the Bluemix CLIs:

 1) As a prerequisite for the IBM Bluemix Container Service plug-in, install the [Bluemix CLI](https://clis.ng.bluemix.net/ui/home.html) External link icon. The prefix for running commands by using the Bluemix CLI is bx.

 2) Log in to the Bluemix CLI. Enter your Bluemix credentials when prompted.

        $ bx login

3) To create Kubernetes clusters and manage worker nodes, install the IBM Bluemix Container Service plug-in. The prefix for running commands by using the IBM Bluemix Container Service plug-in is `bx cs.`

        $ bx plugin install container-service -r Bluemix

    To verify that the plug-in is installed properly, run the following command:

        $ bx plugin list
        Listing installed plug-ins...

        Plugin Name          Version   
        container-service    0.1.328   
        container-registry   0.1.215 

4) To view a local version of the Kubernetes dashboard and to deploy apps into your clusters, [install the Kubernetes CLI](https://kubernetes.io/docs/tasks/tools/install-kubectl/) External link icon. The prefix for running commands by using the Kubernetes CLI is `kubectl.`

    a. Download the Kubernetes CLI for your machine.

    b. Move the executable file to the `/usr/local/bin` directory.

            $ mv /<path_to_file>/kubectl /usr/local/bin/kubectl

     Make sure that `/usr/local/bin` is listed in your `PATH` system variable. The PATH variable contains all directories where your operating system can find executable files. The directories that are listed in the `PATH` variable serve different purposes. `/usr/local/bin` is used to store executable files for software that is not part of the operating system and that was manually installed by the system administrator.

            $ echo $PATH
            /usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin

    c. Convert the binary file to an executable.

            $ chmod +x /usr/local/bin/kubectl

5) To manage a private image repository, install the Bluemix Container Registry plug-in. Use this plug-in to set up your own namespace in a multi-tenant, highly available, and scalable private image registry that is hosted by IBM, and to store and share Docker images with other users. Docker images are required to deploy containers into a cluster. The prefix for running registry commands is `bx cr.`

        $ bx plugin install container-registry -r Bluemix

To verify that the plug-in is installed properly, run the following command:

        $ bx plugin list

The plug-in is displayed in the results as container-registry.

6) To build images locally and push them to your registry namespace, [install Docker](https://www.docker.com/community-edition#/download) External link icon. If you are using Windows 8 or earlier, you can install the [Docker Toolbox](https://www.docker.com/products/docker-toolbox) External link icon instead. The Docker CLI is used to build apps into images. The prefix for running commands by using the Docker CLI is `docker.`


### Creating clusters with the CLI

To create a cluster:

1) Install the Bluemix CLI and the [IBM Bluemix Container Service plug-in]().

2) Log in to the Bluemix CLI. Enter your Bluemix credentials when prompted. To specify a Bluemix region, include the API endpoint.

        $ bx login

3) Create a cluster.

    a. Review the locations that are available. The locations that are shown depend on the IBM Bluemix Container Service region that you are logged in.

            $ bx cs locations

    b. Choose a location and review the machine types available in that location. The machine type specifies the virtual compute resources that are available to each worker node.

            $ bx cs machine-types <location>
            Getting machine types list...
            OK
            Machine Types
            Name         Cores   Memory   Network Speed   OS             Storage   Server Type
            u1c.2x4      2       4GB      1000Mbps        UBUNTU_16_64   100GB     virtual
            b1c.4x16     4       16GB     1000Mbps        UBUNTU_16_64   100GB     virtual
            b1c.16x64    16      64GB     1000Mbps        UBUNTU_16_64   100GB     virtual
            b1c.32x128   32      128GB    1000Mbps        UBUNTU_16_64   100GB     virtual
            b1c.56x242   56      242GB    1000Mbps        UBUNTU_16_64   100GB     virtual


    c. Check to see if a public and private VLAN already exists in the Bluemix Infrastructure for this account.

            $ bx cs vlans <location>
            ID        Name   Number   Type      Router
            1519999   vlan   1355     private   bcr02a.dal10
            1519898   vlan   1357     private   bcr02a.dal10
            1518787   vlan   1252     public   fcr02a.dal10
            1518888   vlan   1254     public    fcr02a.dal10

    d. Run the `cluster-create` command. You can choose between a lite cluster, which includes one worker node set up with 2vCPU and 4GB memory, or a standard cluster, which can include as many worker nodes as you choose in your Bluemix Infrastructure account. When you create a standard cluster, by default, the hardware of the worker node is shared by multiple IBM customers and billed by hours of usage. 

    Example for a standard cluster:

            $ bx cs cluster-create --location dal10 --public-vlan <public_vlan_id> --private-vlan <private_vlan_id> --machine-type u1c.2x4 --workers 3 --name <cluster_name>

    Example for a lite cluster:

            $ bx cs cluster-create --name my_cluster

4) Verify that the creation of the cluster was requested.

        $ bx cs clusters
        OK
        Name         ID                                 State    Created      Workers   Datacenter   Version   
        my_cluster   b25f3efb1d5d42c1bdda5d6f5b7e5e81   normal   1 week ago   1         hou02        1.7.4_1502 
5) Check the status of the worker nodes.

        $ bx cs workers <cluster>
        OK
        ID                                                 Public IP      Private IP      Machine Type   State    Status   Version   
        kube-hou02-pab25f3efb1d5d42c1bdda5d6f5b7e5e81-w1   173.193.99.8   10.76.114.198   free           normal   Ready    1.7.4_1502  

6) Set the cluster you created as the context for this session. Complete these configuration steps every time that you work with your cluster

    a. Get the command to set the environment variable and download the Kubernetes configuration files.
    
            $ bx cs cluster-config <cluster_name_or_id>

    Example for OS X:

            $ export KUBECONFIG=/Users/<user_name>/.bluemix/plugins/container-service/clusters/<cluster_name>/kube-config-prod-dal10-<cluster_name>.yml

    b. Copy and paste the command that is displayed in your terminal to set the `KUBECONFIG` environment variable.

    c. Verify that the `KUBECONFIG` environment variable is set properly.

    Example for OS X:

            $ echo $KUBECONFIG
            /Users/<user_name>/.bluemix/plugins/container-service/clusters/<cluster_name>/kube-config-prod-dal10-<cluster_name>.yml

7) Launch your Kubernetes dashboard with the default port 8001.

        $ kubectl proxy
        Starting to serve on 127.0.0.1:8001

    Open the following URL in a web browser to see the Kubernetes dashboard.

        $ http://localhost:8001/ui


Then you could see that your dashboard is clean and nothing is running like pods, replication controllers, services, etc. To create the pods and expose them as a service you could use the above code directory. And, simply run the below commands.

        $ kubectl get nodes
        $ kubectl get pods
        $ kubectl create -f color-pod.yml 
        $ kubectl get pods
        $ kubectl create -f color-rc.yml 
        $ kubectl get rcs
        $ kubectl describe pod red
        $ kubectl create -f color-svc.yml 
        $ kubectl get svc
        $ kubectl describe service red
        $ kubectl cluster-info
        $ kubectl cluster-info dump
        $ kubectl get svc
        $ kubectl cluster-info
        $ kubectl get svc
        $ kubectl describe svc red

Then you can hit the public ip of the cluster, http://173.193.99.8:31002/ to get the repsective output as the color of its service.


