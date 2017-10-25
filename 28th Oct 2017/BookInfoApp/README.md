# BookInfo Istio Project
        
Create a kubernetes cluster using any of the tool like, `kubeadm`, `helm`, `minikube`, etc.

        $ kubeadm init --apiserver-advertise-address $(hostname -i)

Or

On local machine i.e. minikube, run 

        $ minikube start

To view current status of the cluster as their's nothing, this will show no resources found,

        $ kubectl get pods

### Prerequisites

Starting with the 0.2.7 release, Istio is installed in its own istio-system namespace, and can manage micro-services from all other namespaces.  Download the installation file corresponding to your OS. as on linux,

        $ curl -L https://git.io/getLatestIstio | sh -

Add the `istioctl` client to your PATH. For example, run the following command on a MacOS or Linux system:

        $ export PATH="$PATH:/istio-0.2.7/bin"

## Install Istio’s core components. Choose one of the two mutually exclusive options below:

a) Install Istio without enabling mutual TLS authentication between sidecars. Choose this option for clusters with existing applications, applications where services with an Istio sidecar need to be able to communicate with other non-Istio Kubernetes services, and applications that use liveliness and readiness probes, headless services, or StatefulSets.

        $ ls
        $ cd istio-0.2.7/
        $ kubectl apply -f install/kubernetes/istio.yaml
    
Or

b) Install Istio and enable mutual TLS authentication between sidecars:

        $ kubectl apply -f install/kubernetes/istio-auth.yaml

Both options create the `istio-system` namespace along with the required RBAC permissions, and deploy `Istio-Pilot`, `Istio-Mixer`, `Istio-Ingress`, `Istio-Egress`, and `Istio-CA (Certificate Authority)`.

**Optional**: If your cluster has Kubernetes alpha features enabled, and you wish to enable a automatic injection of sidecar, install the Istio-Initializer:
        
        $ kubectl apply -f install/kubernetes/istio-initializer.yaml

### Verifying the installation

1) Ensure the following Kubernetes services are deployed: `istio-pilot`, `istio-mixer`, `istio-ingress`, `istio-egress`.

        $ kubectl get svc -n istio-system
        NAME            CLUSTER-IP      EXTERNAL-IP       PORT(S)                       AGE
        istio-egress    10.83.247.89    <none>            80/TCP                        5h
        istio-ingress   10.83.245.171   35.184.245.62     80:32730/TCP,443:30574/TCP    5h
        istio-pilot     10.83.251.173   <none>            8080/TCP,8081/TCP             5h
        istio-mixer     10.83.244.253   <none>            9091/TCP,9094/TCP,42422/TCP   5h

**Note:**  If your cluster is running in an environment that does not support an external load balancer (e.g., minikube), the `EXTERNAL-IP` of `istio-ingress` says `<pending>`. You must access the application using the service NodePort, or use port-forwarding instead.

2) Ensure the corresponding Kubernetes pods are deployed and all containers are up and running: `istio-pilot-*`, `istio-mixer-*`, `istio-ingress-*`, `istio-egress-*`, `istio-ca-*`, and, optionally, `istio-initializer-*`.

        $ kubectl get pods -n istio-system

## Deploy your application

To collect and view metrics provided by Mixer, install Prometheus Grafana and ServiceGraph addons.

a) Prometheus gathers metrics from the Mixer. 

        $ kubectl apply -f install/kubernetes/addons/prometheus.yaml

b) Grafana produces dashboards based on the data collected by Prometheus. 
   
        $ kubectl apply -f install/kubernetes/addons/grafana.yaml

c) ServiceGraph delivers the ability to visualise dependencies between services. 
        
        $ kubectl apply -f install/kubernetes/addons/servicegraph.yaml

Zipkin offers distributed tracing. 
   
        $ kubectl apply -f install/kubernetes/addons/zipkin.yaml

As with Istio, these addons are deployed via Pods. So, check the status using,
   
        $ kubectl get pods -n istio-system

    
## BookInfo Application

To showcase `Istio`, a BookInfo web application has been created. This sample deploys a simple application composed of four separate microservices which will be used to demonstrate various features of the Istio service mesh.

When deploying an application that will be extended via Istio, the Kubernetes YAML definitions are extended via kube-inject. This will configure the services proxy sidecar (Envoy), Mixers, Certificates and Init Containers.
        
        $ kubectl apply -f <(istioctl kube-inject -f samples/bookinfo/kube/bookinfo.yaml)

### Check Status
    
        $ kubectl get pods

When the Pods are starting, you may see initiation steps happening as the container is created. This is configuring the Envoy sidecar for handling the traffic management and authentication for the application within the Istio service mesh.

Once running the application can be accessed via the path `/productpage`. You can visit its respective IP address along with api, as `https://IP_address/productpage`

The ingress routing information can be viewed using 

        $ kubectl describe ingress

## Bookinfo Architecture

**The BookInfo sample application deployed is composed of four microservices:**

i) The `productpage microservice` is the homepage, populated using the details and reviews microservices.

ii) The `details microservice` contains the book information.

iii) The `reviews microservice` contains the book reviews. It uses the ratings microservice for the star rating.

iv) The `ratings microservice` contains the book rating for a book review.

**The deployment included three versions of the reviews microservice to showcase different behaviour and routing:**

i) `Version v1` doesn’t call the ratings service.
ii) `Version v2` calls the ratings service and displays each rating as 1 to 5 black stars.
iii) `Version v3` calls the ratings service and displays each rating as 1 to 5 red stars.

The services communicates over HTTP using DNS for service discovery. An overview of the architecture is shown below.


**Control Routing**

One of the main features of Istio is its `traffic management`. As a Microservice architectures scale, there is a requirement for more advanced service-to-service communication control.

**User Based Testing**

One aspect of traffic management is controlling traffic routing based on the HTTP request, such as user agent strings, IP address or cookies.

The example below will send all traffic for the user "jason" to the reviews:v2, meaning they'll only see the black stars.

To view the the rule for traffic routing, 

        $ cat samples/bookinfo/kube/route-rule-reviews-test-v2.yaml

Similarly to deploying Kubernetes configuration, routing rules can be applied using istioctl.

        $ istioctl create -f samples/bookinfo/kube/route-rule-reviews-test-v2.yaml

Visit the product page and signin as a user jason (password jason)


**Traffic Shaping for Canary Releases**

The ability to split traffic for testing and rolling out changes is important. This allows for A/B variation testing or deploying canary releases.

The rule below ensures that 50% of the traffic goes to reviews:v1 (no stars), or reviews:v3 (red stars).

        $ cat samples/bookinfo/kube/route-rule-reviews-50-v3.yaml

Likewise, this is deployed using istioctl.

        $ istioctl create -f samples/bookinfo/kube/route-rule-reviews-50-v3.yaml

**Note:** The weighting is not round robin, multiple requests may go to the same service.

**New Releases**

Given the above approach, if the canary release were successful then we'd want to move 100% of the traffic to reviews:v3.

        $ cat samples/bookinfo/kube/route-rule-reviews-v3.yaml

This can be done by updating the route with new weighting and rules.

        $ istioctl replace -f samples/bookinfo/kube/route-rule-reviews-v3.yaml

**List All Routes**

It's possible to get a list of all the rules applied using istioctl get routerules

        $ istioctl get routerules

**Access Metrics**

With Istio's insight into how applications communicate, it can generate profound insights into how applications are working and performance metrics.

**Generate Load**

Make view the graphs, there first needs to be some traffic. Execute the command below to send requests to the application.

        $ while true; do
            curl -s https://2886795283-80-frugo01.environments.katacoda.com/productpage > /dev/null
            echo -n .;
            sleep 0.2
        done

**Access Dashboards**

With the application responding to traffic the graphs will start highlighting what's happening under the covers.

**Grafana**

The first is the Istio Grafana Dashboard. The dashboard returns the total number of requests currently being processed, along with the number of errors and the response time of each call.

    $ https://IP-address/dashboard/db/istio-dashboard

As Istio is managing the entire service-to-service communicate, the dashboard will highlight the aggregated totals and the breakdown on an individual service level.

**Zipkin**

Zipkin provides tracing information for each HTTP request. It shows which calls are made and where the time was spent within each request.

    $ https://IP-address/zipkin/?serviceName=productpage

Click on a span to view the details on an individual request and the HTTP calls made. This is an excellent way to identify issues and potential performance bottlenecks.

**Service Graph**

As a system grows, it can be hard to visualise the dependencies between services. The Service Graph will draw a dependency tree of how the system connects.

    $ https://IP-address/dotviz

Before continuing, stop the traffic process with Ctrl+C

**Visualise Cluster using Weave Scope**

While Service Graph displays a high-level overview of how systems are connected, a tool called Weave Scope provides a powerful visualisation and debugging tool for the entire cluster.

Using Scope it's possible to see what processes are running within each pod and which pods are communicating with each other. This allows users to understand how Istio and their application is behaving

Deploy Scope
    
Scope is deployed onto a Kubernetes cluster with the command 

        $ kubectl create -f 'https://cloud.weave.works/launch/k8s/weavescope.yaml' --validate=false

Wait for it to be deployed by checking the status of the pods using kubectl get pods

        $ kubectl get pods

Make Scope Accessible

Once deployed, expose the service to the public.

        $ pod=$(kubectl get pod --selector=name=weave-scope-app -o jsonpath={.items..metadata.name})
            kubectl expose pod $pod --external-ip="172.17.0.53" --port=4040 --target-port=4040

**Important:** Scope is a powerful tool and should only be exposed to trusted individuals and not the outside public. Ensure correct firewalls and VPNs are configured.

View Scope on port 4040 at https://IP-address:4040/

**Generate Load**

Scope works by mapping active system calls to different parts of the application and the underlying infrastructure. Create load to see how various parts of the system now communicate.

        $ while true; do
            curl -s https://IP-address/productpage > /dev/null
            echo -n .;
            sleep 0.2
            done

On minikube local cluster, to access the application user the following commands,
        $ kubectl cluster-info

If your Kubernetes cluster is running in an environment that supports external load balancers, the IP address of ingress can be obtained by the following command(Minikube does not support it):

        $ kubectl get ingress -o wide
        NAME      HOSTS     ADDRESS   PORTS     AGE
        gateway   *                   80        5h

`IBM Bluemix Free Tier`: External load balancer is not available for kubernetes clusters in the free tier in Bluemix. You can use the public IP of the worker node, along with the NodePort, to access the ingress. The public IP of the worker node can be obtained from the output of the following command:
        
        $ bx cs workers <cluster-name or id>
        
        $ export GATEWAY_URL=<public IP of the worker node>:$(kubectl get svc istio-ingress -n istio-system -o jsonpath='{.spec.ports[0].nodePort}')

`Minikube`: External load balancers are not supported in Minikube. You can use the host IP of the ingress service, along with the NodePort, to access the ingress.
        
        $ export GATEWAY_URL=$(kubectl get po -n istio-system -l istio=ingress -o 'jsonpath={.items[0].status.hostIP}'):$(kubectl get svc istio-ingress -n istio-system -o 'jsonpath={.spec.ports[0].nodePort}')

Use the curl command to send the REST request to the api endpoint, 
        
        $ curl -o /dev/null -s -w "%{http_code}\n" http://${GATEWAY_URL}/productpage

Get the IP address from the above GATEWAY_URL so you could directly visit the application inside the browser,

        $ echo $GATEWAY_URL

Or you can user the curl command to check the response.

        $ curl -o /dev/null -s -w "%{http_code}\n" http://${GATEWAY_URL}/productpage

Verify that the new metric values are being generated and collected.

In a Kubernetes environment, setup port-forwarding for Prometheus by executing the following command:
        $ kubectl -n istio-system port-forward $(kubectl -n istio-system get pod -l app=prometheus -o jsonpath='{.items[0].metadata.name}') 9090:9090 &

Verify that the logs stream has been created and is being populated for requests.

In a Kubernetes environment, search through the logs for the Mixer pod as follows:

        $ kubectl -n istio-system logs $(kubectl -n istio-system get pods -l istio=mixer -o jsonpath='{.items[0].metadata.name}') mixer | grep \"instance\":\"newlog.logentry.istio-system\"

Zipkin

Setup access to the Zipkin dashboard URL using port-forwarding:

        $ kubectl port-forward -n istio-system $(kubectl get pod -n istio-system -l app=zipkin -o jsonpath='{.items[0].metadata.name}') 9411:9411 &

Viewing the Istio dashboard

Verify that the service is running in your cluster.

In Kubernetes environments, execute the following command:

        $  kubectl -n istio-system get svc grafana

Open the Istio Dashboard via the Grafana UI.

In Kubernetes environments, execute the following command:

        $  kubectl -n istio-system port-forward $(kubectl -n istio-system get pod -l app=grafana -o jsonpath='{.items[0].metadata.name}') 3000:3000 &

Visit http://localhost:3000/dashboard/db/istio-dashboard in your web browser.

Generating a Service Grap

Verify that the service is running in your cluster.

In Kubernetes environments, execute the following command:

        $  kubectl -n istio-system get svc servicegraph

Open the Servicegraph UI.

In Kubernetes environments, execute the following command:

        $  kubectl -n istio-system port-forward $(kubectl -n istio-system get pod -l app=servicegraph -o jsonpath='{.items[0].metadata.name}') 8088:8088 &   

Visit http://localhost:8088/dotviz in your web browser.