# Phase 0 — Map of the assignment

Read this once before you write any code. The later phases assume you know this picture.

## Goal

ShopLite is a product catalogue: a page that lists products and a form that adds one. It has to leave your laptop and run on three plain EC2 instances, using images you publish on Docker Hub. The database must never be reachable from the internet.

You implement each phase yourself. These notes say what to build and how to know it works. They do not contain the app, the Dockerfiles, or the README answers.

## Stack

- Frontend: React with Vite. One page, a product list, and an add-product form.
- Backend: Node.js and Express. `GET /api/products` and `POST /api/products`.
- Database: the official PostgreSQL image. You do not write a Dockerfile for the database. The assignment only requires Dockerfiles for the frontend and the backend.

## How a request moves

A browser talks only to EC2-1, port 80. Nginx installed on that host (not inside a container) does two jobs:

- `/` goes to the frontend container running on EC2-1.
- `/api` goes to the backend container running on EC2-2.

The backend opens a Postgres connection to EC2-3’s private IP on port 5432. EC2-2 and EC2-3 have no public IP. A NAT gateway in the public subnet lets them open outbound connections (image pulls, OS patches) without accepting inbound connections from the internet.

There are two Nginx processes, and they are not duplicates:

- Inside the frontend image, Nginx only serves the built React files.
- On the EC2-1 host, Nginx is the only public door. This is the one you install by hand.

A Docker network does not span instances. Containers on one EC2 find each other by name. Containers on another EC2 are reached by that instance’s private IP and a published port.

## Folder layout you will create

```text
frontend/     React app and its Dockerfile
backend/      Express app and its Dockerfile
nginx/        host Nginx config you will copy onto EC2-1
phases/       these notes
README.md     written in phase 5, in your own words
```

Keep passwords out of git. A `.env.example` with empty values is fine. A real `.env` is not.

## Laptop versus AWS

On your laptop, run PostgreSQL in Docker so you can develop without AWS. That local database is only for development.

On AWS, every application container is `docker pull`ed from Docker Hub. Do not copy, clone, or build source on any EC2. The database container is the official `postgres` image, also pulled, with a named volume you create on EC2-3.

## Marks, and which phase covers them

- Part A (15) — the three tiers. Phase 1.
- Part B (20) — your Dockerfiles, public Docker Hub repos, a real version tag. `latest` alone is rejected. Phase 2.
- Part C (20) — one VPC, a public subnet, a private subnet, three EC2s, least-privilege security groups. Phase 3.
- Part D (25) — pull-only deploy, host Nginx, user-defined networks, named volume, private DB connection, data that survives container removal and reboot. Phase 4.
- Part E (20) — five short answers in the README, in your own words. Phase 5 tells you what to think about. It does not give you the answers.

## Order

Finish a phase and meet its “done when” check before starting the next. Phase 3 spends real money (EC2 and a NAT gateway). Do not create those resources until phase 2 images are on Docker Hub, and delete them after you have the screenshots.

## Done when

You can explain, without looking at these notes, which instance runs which process, which path is public, and why the database has no public IP.
