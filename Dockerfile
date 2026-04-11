FROM node:22.14-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# npm install (not ci) — lock file omits alpine/musl native bindings that
# rolldown (Vite 8) requires; npm resolves the correct platform packages here
RUN npm install
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
ARG NGINX_CONF=nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY ${NGINX_CONF} /etc/nginx/conf.d/default.conf
EXPOSE 8080
