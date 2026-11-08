# Phase 2 — Images and Docker Hub

Part B. Package the frontend and the backend, tag them with a version, and push to public Docker Hub repos. Do this before you create any EC2.

## Goal

Two public images, each with a version tag such as `1.0.0`. A grader (and your EC2 instances) can `docker pull` them without your source tree. The tag `latest` by itself is not accepted. You may also push `latest`, but a real version tag must exist and must be the one you deploy.

## Why the images look like this

The frontend that ships is the production build (`vite build`), a folder of static files. The image does not run the Vite dev server. Use a multi-stage build: a Node stage compiles the app, a second stage copies the built files into an Nginx image that only serves those files. That Nginx is inside the image. It is not the host Nginx from phase 4.

The backend image runs Node. Database settings are runtime environment variables, passed when the container starts. If you bake the password or `DB_HOST` into the image, every environment shares one secret and you cannot point the same image at EC2-3.

The database stays the official `postgres` image. No Dockerfile for it.

## What you build

**Backend Dockerfile**, in `backend/`:

- a Node LTS base
- install production dependencies from your lockfile
- copy the app source
- document the listen port with `EXPOSE`
- start the server with the same command you use locally

Do not copy a `.env` file into the image. The container receives env vars at `docker run` time.

**Frontend Dockerfile**, in `frontend/`:

- stage 1: Node, install dependencies, `npm run build`
- stage 2: an Nginx image, copy the build output to the Nginx html directory
- the files must be served as a static site, including a fallback to `index.html` for client-side routes if you add any

Because the app uses relative `/api` URLs, the image contains no API host. Do not add a build-time `VITE_` URL that points at localhost or a private IP.

**Docker Hub.** Create two public repositories, for example `yourname/shoplite-frontend` and `yourname/shoplite-backend`.

Build and push with an explicit version. From each app directory, the shape is:

```bash
docker build -t yourname/shoplite-backend:1.0.0 .
docker push yourname/shoplite-backend:1.0.0

docker build -t yourname/shoplite-frontend:1.0.0 .
docker push yourname/shoplite-frontend:1.0.0
```

Log in with `docker login` first. After a push, open the tag on Docker Hub and confirm `1.0.0` is listed, not only `latest`.

## Prove the images without source on the machine

From a directory that is not your repo (so you cannot accidentally use local files):

```bash
docker run --rm -p 8080:80 yourname/shoplite-frontend:1.0.0
docker run --rm -p 3000:3000 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_USER=... \
  -e DB_PASSWORD=... \
  -e DB_NAME=... \
  yourname/shoplite-backend:1.0.0
```

`host.docker.internal` is a laptop convenience so the backend container can see Postgres running on your machine. On EC2 you will set `DB_HOST` to EC2-3’s private IP instead. Point a local Nginx, or a one-off proxy, at both if you want to click through the UI. At minimum, `curl` the backend’s `GET /api/products` and confirm the frontend container returns the built HTML.

## Done when

- Both repos are public and show tag `1.0.0`.
- `docker pull yourname/shoplite-backend:1.0.0` works from a machine that does not have the source.
- The backend container refuses to start usefully without the DB env vars, and works when they are passed on the command line.
- No password appears in `docker history` or in the repo.

## Usual mistakes

- Tagging only `latest`.
- Leaving the Vite dev server as the container command. The image must serve the production build.
- Copying `.env` into the image with `COPY . .`.
- Setting the API base URL at build time to `http://localhost:3000`.
- A private Docker Hub repo. The assignment wants public repos, and a private EC2 cannot log in unless you store credentials there.
