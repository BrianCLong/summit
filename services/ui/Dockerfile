FROM nginx:stable-alpine
COPY services/ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY services/ui/index.html /usr/share/nginx/html
COPY services/ui/public /usr/share/nginx/html/public