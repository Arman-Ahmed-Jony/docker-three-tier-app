# Phase 4 — Deploy from Docker Hub

Part D. The instances already exist. You install Docker, pull images, and run containers. You do not clone the repo on any EC2, and you do not run `docker build` there.

## Goal

A product added in the browser is stored in Postgres on EC2-3 and is still there after a refresh, after the database container is removed and started again, and after EC2-3 reboots.

## Install Docker and create a network

On each of the three instances, install Docker Engine from Docker’s own apt repository (the `docker.io` package is fine if it gives you a current engine). Then create a network you name yourself. Do this on every instance, including ones that will run a single container. The default bridge is not accepted.

```bash
docker network create shoplite
docker network ls
```

`docker network ls` must show `shoplite` with driver `bridge`, and your containers must not be on `bridge`. Confirm later with `docker network inspect shoplite` and with `docker inspect` on the container: `NetworkMode` and the network name should be `shoplite`.

## EC2-3 — Postgres and a named volume

A named volume is a directory Docker manages on the host. It outlives the container. Removing the container does not remove the volume. A reboot does not remove it either. A new container that mounts the same volume sees the old files.

Postgres in the official image stores data in `/var/lib/postgresql/data`. Mount your volume there.

```bash
docker volume create pgdata

docker run -d --name db --restart unless-stopped \
  --network shoplite \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  -e POSTGRES_USER=shoplite \
  -e POSTGRES_PASSWORD='choose-a-long-password' \
  -e POSTGRES_DB=shoplite \
  postgres:16
```

`--network shoplite` satisfies the assignment. `-p 5432:5432` is what lets EC2-2 connect. Docker DNS names are visible only to containers on this host, so the backend on another machine uses EC2-3’s private IP, not the name `db`.

`--restart unless-stopped` starts the container again after an instance reboot. The volume keeps the rows. The restart policy only brings the process back.

Check:

```bash
docker volume ls
docker volume inspect pgdata
```

The inspect output should show the mountpoint on the host. Screenshot both commands.

## EC2-2 — backend

Pull the version tag, not `latest`.

```bash
docker pull yourname/shoplite-backend:1.0.0

docker run -d --name backend --restart unless-stopped \
  --network shoplite \
  -p 3000:3000 \
  -e DB_HOST=EC2_3_PRIVATE_IP \
  -e DB_PORT=5432 \
  -e DB_USER=shoplite \
  -e DB_PASSWORD='the-same-password' \
  -e DB_NAME=shoplite \
  yourname/shoplite-backend:1.0.0
```

From EC2-2, `curl -s http://127.0.0.1:3000/api/products` should return JSON (an empty array the first time). If it does not, read `docker logs backend` before you touch Nginx. A 502 later is often this container already failing.

The security group, not `-p`, decides who can open that port. `-p 3000:3000` listens on the instance. Only EC2-1’s security group is allowed to connect.

## EC2-1 — frontend container and host Nginx

Bind the frontend to loopback so the only public port is host Nginx on 80. Users must not be able to skip Nginx by hitting the container’s port.

```bash
docker pull yourname/shoplite-frontend:1.0.0

docker run -d --name frontend --restart unless-stopped \
  --network shoplite \
  -p 127.0.0.1:8080:80 \
  yourname/shoplite-frontend:1.0.0
```

Install Nginx with apt on the host. Do not run this Nginx in a container. Put the config you write in the repo at `nginx/` so the submission contains it, then copy that file to the host’s Nginx config and reload.

The server listens on port 80. Two locations matter:

```nginx
location /api/ {
    proxy_pass http://EC2_2_PRIVATE_IP:3000;
}

location / {
    proxy_pass http://127.0.0.1:8080;
}
```

`proxy_pass` with no path after the port forwards the original URI unchanged. A request to `/api/products` arrives at the backend as `/api/products`. If you write `proxy_pass http://EC2_2_PRIVATE_IP:3000/;` (a URI with a trailing slash), Nginx strips the matched location prefix and the backend will not see `/api`. That mistake shows up as 404s or 502s depending on how the backend reacts. Keep the form above, with no trailing path.

Reload Nginx, then from your laptop open `http://EC2_1_PUBLIC_IP`. The React app should load, and the browser’s API calls should go to `http://EC2_1_PUBLIC_IP/api/products`, not to EC2-2.

## Persistence test

Do this on EC2-3 and keep screenshots.

1. Add a product in the browser. Refresh. It is still listed.
2. `docker rm -f db`. The container is gone. `docker volume ls` still shows `pgdata`.
3. Start a new container with the same `docker run` as above, same volume name, same env.
4. Refresh the browser. The product is still there.
5. Reboot EC2-3. After it comes back, `docker ps` shows `db` running because of `--restart unless-stopped`, and the product is still there.

If step 4 fails, the new container did not mount `pgdata`, or it mounted a different path than `/var/lib/postgresql/data`.

## Done when

- `docker ps` on each instance shows only pulled images (`yourname/shoplite-frontend:1.0.0`, `yourname/shoplite-backend:1.0.0`, `postgres:16`), each attached to `shoplite`.
- `docker network inspect shoplite` on each instance lists that instance’s container.
- The browser works through EC2-1 port 80 only. EC2-2’s port 3000 is not reachable from your laptop.
- The product survives container removal and an instance reboot.
- Nothing in `history` or `ls` on the instances shows a git clone or a source build.

## Usual mistakes

- `docker build` or `git clone` on an EC2 “just to fix a line”.
- Running on the default bridge.
- Publishing the frontend on `0.0.0.0:8080`, so users can bypass Nginx.
- Forgetting `-p` on the database or backend and expecting the other instance to use the Docker network name.
- A trailing slash on `proxy_pass` that strips `/api`.
- An anonymous volume (`-v /var/lib/postgresql/data` with no name). That is not a named volume you created, and it is easy to lose.
- No restart policy, so a reboot leaves the data on disk and the app down.
