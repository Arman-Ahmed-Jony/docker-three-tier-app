# Phase 5 — README, screenshots, and Part E

The submission is the GitHub repo. The README is where the grader finds the architecture, the image links, the steps you actually ran, and your Part E answers. Write the answers yourself. These notes only tell you what to check. Copied wording scores as copied work.

## README contents

Write `README.md` at the repo root. Include:

- A short project overview: what ShopLite is, and the three tiers.
- An architecture diagram that matches what you deployed. Show the browser, EC2-1 with host Nginx and the frontend container, EC2-2 with the backend, EC2-3 with Postgres, the public and private subnets, and the NAT gateway. Mark which path is public (port 80 on EC2-1) and which paths are private.
- Docker Hub links for both images, including the version tag you deployed, not only `latest`.
- The step-by-step deployment you followed: VPC and subnets, security groups, how you reached the private instances, the `docker network` and `docker volume` commands, the `docker run` commands, and where you installed the host Nginx config.
- The Part E answers, each in a short paragraph of your own.

Also say, in a sentence, that the instances and the NAT gateway should be terminated after grading so they stop costing money. Do that yourself once the screenshots are in the repo.

## Screenshots to embed

Put the image files in the repo and embed them in the README. One shot per item:

- The app in a browser, with at least one product visible, address bar showing EC2-1 on port 80.
- `docker ps` on EC2-1, on EC2-2, and on EC2-3.
- `docker network ls` and `docker network inspect` on each EC2.
- `docker volume ls` and `docker volume inspect` on EC2-3.
- Inbound rules of each security group.
- EC2-3’s instance details page showing no public IP.
- The same product still listed after you removed the database container and started a new one on the same volume.

Take these during phase 4, before you delete the infrastructure.

## Part E — what to think through

Answer each question from the design you built. A good answer names the specific place you would look and what you would change. It does not list every Docker command you know.

**Q1. The page loads, and every API call is 502.**

The HTML arrived, so host Nginx and the frontend container are up. A 502 means Nginx could not get a valid response from the upstream it proxies `/api` to. Walk the path: Nginx error log on EC2-1, then whether EC2-2’s security group allows port 3000 from EC2-1, then `docker ps` and `docker logs` on the backend, then whether the backend is crashing because it cannot reach Postgres. Fix the first broken hop. Say which hop you would check first and why the others are later.

**Q2. An OS patch has to reach EC2-3 without breaking the “no public database” rule.**

Separate inbound from outbound. EC2-3 has no public IP and its subnet routes `0.0.0.0/0` to the NAT gateway, not to the internet gateway. `apt` opens an outbound connection. The NAT gateway translates it. Nobody on the internet can open a connection to port 5432, because there is still no inbound path and the security group does not allow the world. Describe that path in your own words. Do not “fix” it by adding a public IP for the duration of the patch.

**Q3. A bad backend image is live, and the old one must be back within two minutes.**

You tagged the previous image (`1.0.0`) and pushed it. It is still on Docker Hub after you push `1.0.1`. Rollback is: pull the old tag on EC2-2, remove the running backend container, start a new one with the same network, port, restart policy, and env vars, and the old tag. You do not rebuild, and you do not need the database to change. Say why the version tag is what makes this fast, and why `latest` alone would not.

**Q4. Someone opened the database port to `0.0.0.0/0`.**

Impact: anyone on the internet who can route to that port can attempt to log in to Postgres. Your design avoids that in two layers. EC2-3 has no public IP and sits in a private subnet, so the internet has no route to it even if the security group is wrong. The security group should still allow 5432 only from the EC2-2 security group, so a mistake in one layer is not the only protection. Also say what you would do when you find the bad rule: delete it, and confirm with a connection attempt from outside that the port is closed.

**Q5. Traffic grows ten times.**

This design has one instance per tier and no load balancer. Name the tier that runs out of CPU, memory, or connections first, and why that one rather than the others. The frontend is static files. The database is a single Postgres with a volume on one small instance. The backend is a single Node process. Pick the one your reasoning supports and say what you would add (another instance, a bigger instance size, or a managed database) while still keeping the database off the public internet. You are not asked to rebuild the project that way.

## Done when

- The README stands alone: a grader who never sees these phase notes can deploy and can find every required screenshot.
- Each Part E answer is a few sentences you could say out loud, tied to EC2-1, EC2-2, EC2-3, the NAT gateway, or the image tag.
- The AWS resources are deleted after the screenshots are committed.

## Usual mistakes

- A diagram that shows one box labeled “Docker” and skips the subnets.
- Image links with no tag, or a tag you did not actually deploy.
- Deployment steps copied from a tutorial that uses `docker compose` on the EC2 hosts. Your deploy was `docker run` on a user-defined network.
- Part E answers that say “check the logs” and stop there.
- Leaving the NAT gateway up overnight.
