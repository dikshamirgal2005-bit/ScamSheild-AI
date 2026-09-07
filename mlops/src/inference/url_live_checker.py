"""
Live URL intelligence for ScamShield AI.

Performs lightweight public-web checks at prediction time instead of relying
only on lexical URL features. Page contents are not downloaded into memory,
and private/loopback targets are rejected to reduce SSRF risk.
"""
from __future__ import annotations

import ipaddress
import socket
from typing import Any, Dict
from urllib.parse import urljoin, urlparse

import requests


class LiveURLChecker:
    """Resolve and probe a public URL with short timeouts."""

    TRUSTED_DOMAINS = {
        "google.com",
        "google.co.in",
        "google.co.uk",
        "youtube.com",
        "youtu.be",
        "microsoft.com",
        "live.com",
        "office.com",
        "bing.com",
        "apple.com",
        "icloud.com",
        "amazon.com",
        "amazon.in",
        "github.com",
        "gitlab.com",
        "wikipedia.org",
        "cloudflare.com",
        "openai.com",
        "chatgpt.com",
        "facebook.com",
        "meta.com",
        "instagram.com",
        "whatsapp.com",
        "linkedin.com",
        "twitter.com",
        "x.com",
        "netflix.com",
        "spotify.com",
        "hdfcbank.com",
        "icicibank.com",
        "onlinesbi.sbi",
        "sbi.co.in",
        "axisbank.com",
        "kotak.com",
        "paytm.com",
        "phonepe.com",
    }

    @classmethod
    def is_trusted(cls, host: str) -> bool:
        if not host:
            return False
        h = host.lower().rstrip(".")
        # Strip www. prefix if present
        if h.startswith("www."):
            h = h[4:]
        for td in cls.TRUSTED_DOMAINS:
            if h == td or h.endswith("." + td):
                return True
        return False

    def __init__(self, timeout: float = 4.0, max_redirects: int = 5):
        self.timeout = timeout
        self.max_redirects = max_redirects

    @staticmethod
    def _is_public_ip(host: str) -> bool:
        try:
            return ipaddress.ip_address(host).is_global
        except ValueError:
            return True

    def _resolve_public(self, hostname: str) -> bool:
        infos = socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
        addresses = {info[4][0] for info in infos}
        return bool(addresses) and all(self._is_public_ip(addr) for addr in addresses)

    def check(self, url: str) -> Dict[str, Any]:
        normalized = url.strip()
        if not normalized.startswith(("http://", "https://")):
            normalized = "https://" + normalized

        current_url = normalized
        parsed = urlparse(current_url)
        hostname = (parsed.hostname or "").lower().rstrip(".")
        result: Dict[str, Any] = {
            "checked": False,
            "reachable": False,
            "dnsResolved": False,
            "httpsValid": parsed.scheme == "https",
            "httpStatus": None,
            "finalUrl": current_url,
            "finalDomain": hostname,
            "redirects": 0,
            "trustedDomain": hostname in self.TRUSTED_DOMAINS,
            "error": None,
        }

        if not hostname:
            result["error"] = "Invalid hostname"
            return result

        try:
            if not self._resolve_public(hostname):
                result["error"] = "Host resolves to a private or non-public IP address"
                return result
            result["dnsResolved"] = True

            session = requests.Session()
            for redirect_index in range(self.max_redirects + 1):
                parsed_current = urlparse(current_url)
                current_host = (parsed_current.hostname or "").lower().rstrip(".")
                if not current_host or not self._resolve_public(current_host):
                    result["error"] = "Redirect target resolves to a private or non-public IP address"
                    return result

                response = session.get(
                    current_url,
                    timeout=self.timeout,
                    allow_redirects=False,
                    stream=True,
                    headers={"User-Agent": "ScamShieldAI-URLChecker/1.0"},
                )
                result["checked"] = True
                result["reachable"] = True
                result["httpStatus"] = response.status_code
                result["finalUrl"] = current_url
                result["finalDomain"] = current_host
                result["httpsValid"] = parsed_current.scheme == "https"
                response.close()

                if response.is_redirect or response.is_permanent_redirect:
                    location = response.headers.get("Location")
                    if not location or redirect_index >= self.max_redirects:
                        break
                    current_url = urljoin(current_url, location)
                    result["redirects"] = redirect_index + 1
                    continue
                break

            result["trustedDomain"] = (
                self.is_trusted(hostname)
                or self.is_trusted(result["finalDomain"])
            )
        except (requests.RequestException, socket.gaierror, OSError) as exc:
            result["checked"] = True
            result["error"] = str(exc)

        return result
