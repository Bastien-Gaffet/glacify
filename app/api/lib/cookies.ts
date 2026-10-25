function isLocalhost(headers: Headers): boolean {
  const host = headers.get("host") || "";
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

export function getSessionCookieOptions(headers: Headers) {
  return {
    httpOnly: true,
    path: "/",
    secure: !isLocalhost(headers),
  };
}
