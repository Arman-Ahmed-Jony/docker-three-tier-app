# Phase 3 — VPC, subnets, and three EC2 instances

Part C. Build the network before you install Docker on the instances. This phase spends money. A NAT gateway bills you while it exists, even with no traffic. Terminate the instances and delete the NAT gateway and its Elastic IP after you have screenshots.

Use one region and one availability zone for all of this. Ubuntu 24.04 LTS is a good AMI so later patching is a normal `apt upgrade`. A `t3.micro` or `t3.small` is enough for each instance.

## Goal

One VPC. One public subnet. One private subnet. Three instances:

- EC2-1 in the public subnet, with a public IP. This is the only machine users touch, and only on port 80.
- EC2-2 in the private subnet, no public IP. Backend container.
- EC2-3 in the private subnet, no public IP. Postgres container.

## Why the routes are split

A public subnet has a route `0.0.0.0/0` to an internet gateway. Instances there can be reached from the internet if their security group allows it.

A private subnet has no route to the internet gateway. Give it a route `0.0.0.0/0` to a NAT gateway that lives in the public subnet. Outbound connections (Docker Hub, Ubuntu updates) are translated and allowed. Inbound connections from the internet are not, because there is no public IP and no path back through the internet gateway. That is how a patch reaches EC2-3 without putting the database on the internet.

Turn off “auto-assign public IP” on the private subnet. Check the instance details page for EC2-3 and confirm the public IPv4 field is empty. That screenshot is part of the submission.

## Build order

1. VPC. A `/16` such as `10.0.0.0/16` is plenty.
2. Public subnet, for example `10.0.1.0/24`. Private subnet, for example `10.0.2.0/24`.
3. Internet gateway, attached to the VPC.
4. Public route table: `10.0.0.0/16` local, `0.0.0.0/0` to the internet gateway. Associate it with the public subnet.
5. NAT gateway in the public subnet, with its own Elastic IP.
6. Private route table: `10.0.0.0/16` local, `0.0.0.0/0` to the NAT gateway. Associate it with the private subnet. Do not add the internet gateway to this table.
7. Three security groups, then the three instances.

Write down the private IPs. Phase 4 uses them in Nginx and in `DB_HOST`.

## Security groups

Least privilege means each inbound rule names the smallest source that needs it. Prefer a security group as the source, not a CIDR, so the rule follows the instance if the private IP changes.

**EC2-1 (public web)**

- Inbound TCP 80 from `0.0.0.0/0`. This is the app.
- Inbound TCP 22 from your current public IP as a `/32`. This is your SSH. It is not the app, and it is not open to the world.
- Outbound TCP 80 and 443 to `0.0.0.0/0` so the host can install Nginx and Docker.
- Outbound TCP 3000 to the EC2-2 security group, so host Nginx can reach the API. Use the port your backend container publishes.

**EC2-2 (private API)**

- Inbound TCP 3000 from the EC2-1 security group only.
- Inbound TCP 22 from the EC2-1 security group only, so you can jump through the bastion.
- Outbound TCP 5432 to the EC2-3 security group.
- Outbound TCP 80 and 443 to `0.0.0.0/0`, which leaves via the NAT gateway for `docker pull` and package installs.

**EC2-3 (private database)**

- Inbound TCP 5432 from the EC2-2 security group only.
- Inbound TCP 22 from the EC2-1 security group only, for admin and patching.
- Outbound TCP 80 and 443 to `0.0.0.0/0` via the NAT gateway.
- No rule with source `0.0.0.0/0` on port 5432. Not “just for testing”.

Nothing else is inbound. Do not open 3000 or 5432 on EC2-1. Do not give EC2-2 or EC2-3 a public IP “so SSH is easier”.

## Reaching the private instances

You SSH to EC2-1 with its public IP and your key. From your laptop, reach the others in one hop:

```bash
ssh -J ubuntu@EC2_1_PUBLIC_IP ubuntu@EC2_2_PRIVATE_IP
```

`-J` is `ProxyJump`: your laptop connects to EC2-1, and from there to the private IP. The private instance never sees the internet. Put the key on your laptop only. EC2-1’s security group allows SSH to EC2-2 and EC2-3, which is what makes the second hop legal.

Copy the key into the agent (`ssh-add`) so the jump host can forward it, or pass `-i` in a way both hops can use. Do not copy your private key onto EC2-1 and leave it there.

## Done when

- EC2-1 answers on port 80 from your laptop (a default Nginx page is enough; the real config is phase 4) and SSH works from your IP only.
- EC2-2 and EC2-3 show no public IP.
- From EC2-2, `curl` to EC2-3 on port 5432 can open a TCP connection (or you can reach it once Postgres is up in phase 4), and from your laptop that same private IP does not connect.
- From EC2-3, `curl -I https://hub.docker.com` succeeds. That proves the NAT path you will need for `docker pull` and for patches.
- A security-group screenshot of each group shows the sources above.

## Usual mistakes

- Putting EC2-2 or EC2-3 in the public subnet and “just not using” the public IP. The assignment wants no public IP, and a public subnet will try to assign one.
- Routing the private subnet at the internet gateway. Those instances then need public IPs, which breaks the security rule.
- SSH from `0.0.0.0/0`.
- Opening 5432 to `0.0.0.0/0`, or to the whole VPC CIDR, instead of to the EC2-2 security group.
- Forgetting the NAT gateway and then being unable to `docker pull` or `apt upgrade` on EC2-3.
- Leaving the NAT gateway and instances running after you finish. Delete them.
