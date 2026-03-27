FROM node:24-bookworm-slim
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
RUN pnpm prune --prod
RUN addgroup --gid 1337 app && adduser --uid 1337 --ingroup app --disabled-password --no-create-home app
USER 1337:1337
EXPOSE 8080
CMD ["node", "dist/src/index.js", "http"]
