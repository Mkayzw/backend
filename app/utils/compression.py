"""
Compression Utilities for Low-Bandwidth Optimization

Provides response compression and minimal response generation for bandwidth-constrained environments.

Requirements: 15.1, 15.5, 15.6
"""
import gzip
import json
from typing import Any, Optional, Dict
from fastapi import Response
from fastapi.responses import JSONResponse


# Minimum response size for compression (1KB)
COMPRESSION_THRESHOLD = 1024

# Maximum size for minimal confirmation response (500 bytes)
MINIMAL_RESPONSE_MAX_SIZE = 500


def createMinimalResponse(message: str, status: str = "success") -> Dict[str, Any]:
    """
    Create a minimal confirmation response under 500 bytes.
    
    Requirements: 15.6
    """
    response = {
        "status": status,
        "message": message
    }
    
    # Verify response is under 500 bytes
    response_size = len(json.dumps(response).encode('utf-8'))
    if response_size > MINIMAL_RESPONSE_MAX_SIZE:
        # Truncate message if needed
        max_message_length = MINIMAL_RESPONSE_MAX_SIZE - 50  # Account for JSON structure
        response["message"] = message[:max_message_length] + "..."
    
    return response


def compressResponse(data: Any, accept_encoding: Optional[str] = None) -> Response:
    """
    Compress response data using gzip if client accepts it.
    
    Requirements: 15.5
    """
    # Convert data to JSON string
    if isinstance(data, (dict, list)):
        json_str = json.dumps(data)
    else:
        json_str = str(data)
    
    response_bytes = json_str.encode('utf-8')
    
    # Check if compression is accepted and beneficial
    if accept_encoding and 'gzip' in accept_encoding.lower():
        if len(response_bytes) >= COMPRESSION_THRESHOLD:
            compressed = gzip.compress(response_bytes)
            return Response(
                content=compressed,
                media_type="application/json",
                headers={
                    "Content-Encoding": "gzip",
                    "Content-Length": str(len(compressed))
                }
            )
    
    # Return uncompressed response
    return Response(
        content=response_bytes,
        media_type="application/json"
    )


class CompressionMiddleware:
    """
    Middleware for automatic response compression.
    
    Applies gzip compression to responses exceeding 1KB when client accepts it.
    
    Requirements: 15.5
    """
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Get accept-encoding header
        headers = dict(scope.get("headers", []))
        accept_encoding = headers.get(b"accept-encoding", b"").decode('utf-8')
        
        # Store original send
        original_send = send
        
        # Track response
        response_started = False
        response_status = 200
        response_headers = {}
        response_body = bytearray()
        original_start_sent = False
        
        async def send_wrapper(message):
            nonlocal response_started, response_headers, response_body, response_status, original_start_sent
            
            if message["type"] == "http.response.start":
                response_started = True
                response_status = message.get("status", 200)
                response_headers = dict(message.get("headers", []))
                # Don't send yet - wait to see if we need to compress
            elif message["type"] == "http.response.body":
                body = message.get("body", b"")
                if body:
                    response_body.extend(body)
                
                # Check if this is the final chunk
                if not message.get("more_body", False):
                    # Apply compression if applicable
                    if (accept_encoding and 'gzip' in accept_encoding.lower() and 
                        len(response_body) >= COMPRESSION_THRESHOLD and
                        b'content-encoding' not in response_headers):
                        
                        compressed = gzip.compress(bytes(response_body))
                        
                        # Update headers
                        response_headers[b'content-encoding'] = b'gzip'
                        response_headers[b'content-length'] = str(len(compressed)).encode()
                        
                        # Send headers (we haven't sent them yet)
                        await original_send({
                            "type": "http.response.start",
                            "status": response_status,
                            "headers": list(response_headers.items())
                        })
                        
                        # Send compressed body
                        await original_send({
                            "type": "http.response.body",
                            "body": compressed
                        })
                    else:
                        # No compression - send the original start message we held back
                        if not original_start_sent:
                            await original_send({
                                "type": "http.response.start",
                                "status": response_status,
                                "headers": list(response_headers.items())
                            })
                            original_start_sent = True
                        await original_send(message)
                else:
                    # More body chunks coming - send start if not sent yet
                    if not original_start_sent:
                        await original_send({
                            "type": "http.response.start",
                            "status": response_status,
                            "headers": list(response_headers.items())
                        })
                        original_start_sent = True
                    await original_send(message)
        
        await self.app(scope, receive, send_wrapper)
