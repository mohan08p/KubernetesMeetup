### Quick Start

Quick Start instructions to install and configure Istio in a Kubernetes cluster on IBM Bluemix Cloud.

### Prerequisites

Create an IBM Bluemix Cluster as shown in the document, [Kubernetes Bluemix Demo](https://github.com/mohan08p/KubernetesMeetup/blob/master/14th%20Oct%202017/ColorDemo/README.md).

**IBM Bluemix Container Service**

Retrieve your credentials for kubectl (replace <cluster-name> with the name of the cluster you want to use):

    $(bx cs cluster-config <cluster-name>|grep "export KUBECONFIG")

Install or upgrade the Kubernetes CLI kubectl to match the version supported by your cluster (version 1.7 or later for CRD support).

### Installation steps

Starting with the 0.2.7 release, Istio is installed in its own istio-system namespace, and can manage micro-services from all other namespaces.

1) Go to the Istio release page to download the installation file corresponding to your OS. If you are using a MacOS or Linux system, you can also run the following command to download and extract the latest release automatically:

        $ curl -L https://git.io/getLatestIstio | sh -
2) Add the istioctl client to your PATH. For example, run the following command on a MacOS or Linux system:
        
        $ export PATH=$PWD/bin:$PATH

3) Install Istio’s core components. Choose one of the two **mutually exclusive** options below:

    a) Install Istio without enabling [mutual TLS authentication](https://istio.io/docs/concepts/security/mutual-tls.html) between sidecars. Choose this option for clusters with existing applications, applications where services with an Istio sidecar need to be able to communicate with other non-Istio Kubernetes services, and applications that use [liveliness and readiness probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/), headless services, or StatefulSets.

        $ kubectl apply -f install/kubernetes/istio.yaml

    OR

    b) Install Istio and enable mutual TLS authentication between sidecars.:

        $ kubectl apply -f install/kubernetes/istio-auth.yaml

    Both options create the `istio-system` namespace along with the required RBAC permissions, and deploy Istio-Pilot, Istio-Mixer, Istio-Ingress, Istio-Egress, and Istio-CA (Certificate Authority).

    Optional: If your cluster has Kubernetes alpha features enabled, and you wish to enable a [automatic injection of sidecar](https://istio.io/docs/setup/kubernetes/sidecar-injection.html#automatic-sidecar-injection), install the Istio-Initializer:

        $ kubectl apply -f install/kubernetes/istio-initializer.yaml

### Verifying the installation

1) Ensure the following Kubernetes services are deployed: `istio-pilot`, `istio-mixer`,    `istio-ingress`, `istio-egress`.

        $ kubectl get svc -n istio-system
        NAME            CLUSTER-IP      EXTERNAL-IP       PORT(S)                       AGE
        istio-egress    10.83.247.89    <none>            80/TCP                        5h
        istio-ingress   10.83.245.171   35.184.245.62     80:32730/TCP,443:30574/TCP    5h
        istio-pilot     10.83.251.173   <none>            8080/TCP,8081/TCP             5h
        istio-mixer     10.83.244.253   <none>            9091/TCP,9094/TCP,42422/TCP   5h

    Note: If your cluster is running in an environment that does not support an external load balancer (e.g., minikube), the `EXTERNAL-IP` of `istio-ingress` says `<pending>`. You must access the application using the service NodePort, or use port-forwarding instead.

2) Ensure the corresponding Kubernetes pods are deployed and all containers are up and running: `istio-pilot-*`, `istio-mixer-*`, `istio-ingress-*`, `istio-egress-*`, `istio-ca-*`, and, optionally, `istio-initializer-*`.

        $ kubectl get pods -n istio-system
        istio-ca-3657790228-j21b9           1/1       Running   0          5h
        istio-egress-1684034556-fhw89       1/1       Running   0          5h
        istio-ingress-1842462111-j3vcs      1/1       Running   0          5h
        istio-initializer-184129454-zdgf5   1/1       Running   0          5h
        istio-pilot-2275554717-93c43        1/1       Running   0          5h
        istio-mixer-2104784889-20rm8        2/2       Running   0          5h

## Deploy your application

1) Change directory to the root of the Istio installation directory.

2) Bring up the application containers:

    If you are using a cluster with [automatic sidecar injection](https://istio.io/docs/setup/kubernetes/sidecar-injection.html#automatic-sidecar-injection) enabled, simply deploy the services using kubectl:

        $ kubectl apply -f samples/bookinfo/kube/bookinfo.yaml

    If you are using [manual sidecar injection](https://istio.io/docs/setup/kubernetes/sidecar-injection.html#manual-sidecar-injection), use the folloiwng command instead:

        $ kubectl apply -f <(istioctl kube-inject -f samples/bookinfo/kube/bookinfo.yaml)

3) Confirm all services and pods are correctly defined and running:

        $ kubectl get services
        NAME                       CLUSTER-IP   EXTERNAL-IP   PORT(S)              AGE
        details                    10.0.0.31    <none>        9080/TCP             6m
        kubernetes                 10.0.0.1     <none>        443/TCP              7d
        productpage                10.0.0.120   <none>        9080/TCP             6m
        ratings                    10.0.0.15    <none>        9080/TCP             6m
        reviews                    10.0.0.170   <none>        9080/TCP             6m

    and 

        $ kubectl get pods
        NAME                                        READY     STATUS    RESTARTS   AGE
        details-v1-1520924117-48z17                 2/2       Running   0          6m
        productpage-v1-560495357-jk1lz              2/2       Running   0          6m
        ratings-v1-734492171-rnr5l                  2/2       Running   0          6m
        reviews-v1-874083890-f0qf0                  2/2       Running   0          6m
        reviews-v2-1343845940-b34q5                 2/2       Running   0          6m
        reviews-v3-1813607990-8ch52                 2/2       Running   0          6m

### Determining the ingress IP and Port

IBM Bluemix Free Tier: External load balancer is not available for kubernetes clusters in the free tier in Bluemix. You can use the public IP of the worker node, along with the NodePort, to access the ingress. The public IP of the worker node can be obtained from the output of the following command:

    $ bx cs workers <cluster-name or id>

    $ export GATEWAY_URL=<public IP of the worker node>:$(kubectl get svc istio-ingress -n istio-system -o jsonpath='{.spec.ports[0].nodePort}')

To confirm that the BookInfo application is running, run the following curl command:

    $ curl -o /dev/null -s -w "%{http_code}\n" http://${GATEWAY_URL}/productpage
    200

You can also point your browser to `http://$GATEWAY_URL/productpage` to view the Bookinfo web page. If you refresh the page several times, you should see different versions of reviews shown in productpage, presented in a round robin style (red stars, black stars, no stars), since we haven’t yet used Istio to control the version routing.

### Intelligent Routing

This guide demonstrates how to use various traffic management capabilities of an Istio service mesh.

Deploying a microservice-based application in an Istio service mesh allows one to externally control service monitoring and tracing, request (version) routing, resiliency testing, security and policy enforcement, etc., in a consistent way across the services, for the application as a whole.

#### Configuring Request Routing

This task shows you how to configure dynamic request routing based on weights and HTTP headers.

Content-based routing

Set the default version for all microservices to v1.

    $ istioctl create -f samples/bookinfo/kube/route-rule-all-v1.yaml

