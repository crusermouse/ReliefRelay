import asyncio
import time
import httpx
import statistics

async def hit_health(client):
    start = time.perf_counter()
    try:
        response = await client.get("http://localhost:8000/health", timeout=60.0)
        response.raise_for_status()
    except Exception as e:
        print(f"Health check failed: {e}")
    return time.perf_counter() - start

async def hit_export(client):
    try:
        # Increase limit to make the ZIP export artificially slower if needed
        response = await client.get("http://localhost:8000/export/bulk/zip?limit=50", timeout=120.0)
        response.raise_for_status()
        print(f"Export completed, ZIP size: {len(response.content)} bytes")
    except Exception as e:
        print(f"Export failed: {e}")

async def main():
    async with httpx.AsyncClient() as client:
        # Warmup
        try:
            await client.get("http://localhost:8000/health")
        except:
            print("Server might not be running. Start it with: uvicorn backend.main:app --reload")
            return

        print("Starting benchmark...")

        # Start export in background
        export_task = asyncio.create_task(hit_export(client))

        # Wait a tiny bit to ensure export starts processing
        await asyncio.sleep(0.1)

        # Fire 10 concurrent health checks while export is running
        health_tasks = [asyncio.create_task(hit_health(client)) for _ in range(10)]

        # Wait for everything
        times = await asyncio.gather(*health_tasks)
        await export_task

        p50 = statistics.median(times)
        p99 = statistics.quantiles(times, n=100)[98] if len(times) >= 100 else max(times) # Simple p99 approximation
        # For exactly 10 items, standard quantiles doesn't work well for 99th, so we just use max.
        if len(times) == 10:
            p99 = sorted(times)[8] # 90th percentile, or just max
            p99 = max(times)

        print("\n--- Benchmark Results ---")
        print(f"Health Check Count: {len(times)}")
        print(f"Min: {min(times):.4f}s")
        print(f"Max: {max(times):.4f}s")
        print(f"P50: {p50:.4f}s")
        print(f"P99: {p99:.4f}s")


if __name__ == "__main__":
    asyncio.run(main())
