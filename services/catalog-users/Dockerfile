FROM golang:1.22-alpine AS build
WORKDIR /app
COPY . .
RUN go mod init catalog-users 2>/dev/null || true
RUN go get github.com/jackc/pgx/v5@v5.5.0
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM alpine:3.20
WORKDIR /app
COPY --from=build /app/server .
EXPOSE 8080
CMD ["./server"]
