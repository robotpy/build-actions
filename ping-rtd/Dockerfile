# Originally from wei/curl, MIT license
FROM alpine
RUN apk add --no-cache curl ca-certificates
ADD *.sh /
ENTRYPOINT ["/entrypoint.sh"]