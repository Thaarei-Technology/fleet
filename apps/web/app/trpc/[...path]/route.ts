import { type NextRequest, NextResponse } from "next/server";

type ProxyContext = { readonly params: Promise<{ readonly path: string[] }> };

class BodyLimitExceeded extends Error {}

async function readBoundedBody(
  body: ReadableStream<Uint8Array> | null,
  maximumBytes: number,
): Promise<ArrayBuffer | null> {
  if (!body) return null;
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel("body limit exceeded").catch(() => undefined);
        throw new BodyLimitExceeded();
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output.buffer;
}

async function forward(
  request: NextRequest,
  context: ProxyContext,
  prefix: string,
): Promise<NextResponse> {
  const internalUrl = process.env.API_INTERNAL_URL;
  if (!internalUrl)
    return NextResponse.json({ error: "API_INTERNAL_URL is not configured" }, { status: 503 });
  const requestLengthHeader = request.headers.get("content-length");
  const declaredLength = requestLengthHeader === null ? null : Number(requestLengthHeader);
  if (
    declaredLength !== null &&
    (!Number.isSafeInteger(declaredLength) || declaredLength < 0 || declaredLength > 1_048_576)
  ) {
    await request.body?.cancel("declared body limit exceeded").catch(() => undefined);
    return NextResponse.json({ error: "request is too large" }, { status: 413 });
  }
  const { path } = await context.params;
  const encodedPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  const target = new URL(
    prefix.concat(encodedPath.length > 0 ? `/${encodedPath}` : ""),
    internalUrl,
  );
  target.search = request.nextUrl.search;
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("connection");
  headers.delete("forwarded");
  headers.delete("transfer-encoding");
  headers.delete("x-forwarded-for");
  headers.delete("x-forwarded-host");
  headers.delete("x-forwarded-proto");
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      init.body = await readBoundedBody(request.body, 1_048_576);
    } catch (error: unknown) {
      if (error instanceof BodyLimitExceeded)
        return NextResponse.json({ error: "request is too large" }, { status: 413 });
      return NextResponse.json({ error: "request body could not be read" }, { status: 400 });
    }
  }
  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch {
    return NextResponse.json({ error: "upstream request failed" }, { status: 502 });
  }
  const responseLengthHeader = upstream.headers.get("content-length");
  const responseLength = responseLengthHeader === null ? null : Number(responseLengthHeader);
  if (
    responseLength !== null &&
    (!Number.isSafeInteger(responseLength) || responseLength < 0 || responseLength > 2_097_152)
  ) {
    await upstream.body?.cancel("declared body limit exceeded").catch(() => undefined);
    return NextResponse.json({ error: "upstream response is too large" }, { status: 502 });
  }
  let responseBody: ArrayBuffer | null;
  try {
    responseBody = await readBoundedBody(upstream.body, 2_097_152);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof BodyLimitExceeded
            ? "upstream response is too large"
            : "upstream response could not be read",
      },
      { status: 502 },
    );
  }
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-length");
  responseHeaders.delete("set-cookie");
  for (const cookie of upstream.headers.getSetCookie())
    responseHeaders.append("set-cookie", cookie);
  return new NextResponse(responseBody, { status: upstream.status, headers: responseHeaders });
}

export const GET = (request: NextRequest, context: ProxyContext) =>
  forward(request, context, "/trpc");
export const POST = (request: NextRequest, context: ProxyContext) =>
  forward(request, context, "/trpc");
export const PUT = (request: NextRequest, context: ProxyContext) =>
  forward(request, context, "/trpc");
export const PATCH = (request: NextRequest, context: ProxyContext) =>
  forward(request, context, "/trpc");
export const DELETE = (request: NextRequest, context: ProxyContext) =>
  forward(request, context, "/trpc");
