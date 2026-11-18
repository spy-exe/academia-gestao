import hashlib
import fcntl
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPTS = Path(__file__).resolve().parents[1]
PREVIOUS = "a" * 40
TARGET = "b" * 40


class Releases(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="academia-release-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.bin = self.root / "bin"
        self.bin.mkdir()
        for tool in ["chown", "runuser"]:
            self.fake(tool, "#!/bin/sh\nexit 0\n")
        self.fake("systemctl", """#!/usr/bin/env python3
import os, pathlib, sys
root=pathlib.Path(os.environ['APPLICATION_ROOT'])
sha=(root/'current').resolve().name
with (root/'restarts').open('a') as f:f.write(sha+'\\n')
sys.exit(1 if os.environ.get('FAIL_RESTART')==sha else 0)
""")
        self.fake("curl", """#!/usr/bin/env python3
import json, os, pathlib, sys
root=pathlib.Path(os.environ['APPLICATION_ROOT'])
sha=(root/'current').resolve().name
with (root/'probes').open('a') as f:f.write(json.dumps(sys.argv[1:])+'\\n')
if os.environ.get('FAIL_HEALTH')==sha:sys.exit(22)
if sys.argv[-1].endswith('version.json'):print(json.dumps({'commit':sha}))
""")
        self.env = dict(os.environ, PATH=str(self.bin) + ":" + os.environ["PATH"],
                        APPLICATION_ROOT=str(self.root), PUBLIC_URL="http://fixture.test",
                        HEALTH_ATTEMPTS="2", HEALTH_RETRY_DELAY="0")
        self.release(PREVIOUS)
        (self.root / "current").symlink_to(self.root / "releases" / PREVIOUS)
        self.jar = self.root / "artifact.jar"
        self.jar.write_bytes(b"artifact")
        self.dist = self.root / "dist"
        self.dist.mkdir()
        (self.dist / "index.html").write_text("<html>fixture</html>")

    def fake(self, name, content):
        path = self.bin / name
        path.write_text(content)
        path.chmod(0o755)

    def release(self, sha):
        folder = self.root / "releases" / sha
        (folder / "frontend").mkdir(parents=True)
        (folder / "backend.jar").write_bytes(b"old artifact")
        (folder / "frontend/index.html").write_text("<html>old</html>")
        (folder / "frontend/version.json").write_text(json.dumps({"commit": sha}))
        files = [Path("backend.jar"), Path("frontend/index.html")]
        (folder / "SHA256SUMS").write_text("".join(
            f"{hashlib.sha256((folder / f).read_bytes()).hexdigest()}  {f}\n" for f in files))

    def execute(self, script, *args, private_umask=False, **env):
        return subprocess.run([str(SCRIPTS / script), *map(str, args)],
                              env=dict(self.env, **env), capture_output=True, text=True, timeout=10,
                              umask=0o077 if private_umask else 0o022)

    def deploy(self, **env):
        return self.execute("deploy.sh", TARGET, self.jar, self.dist, **env)

    def test_restart_failure_restores_previous_release(self):
        result = self.deploy(FAIL_RESTART=TARGET)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.root / "current").resolve().name, PREVIOUS)
        self.assertEqual((self.root / "restarts").read_text().splitlines(), [TARGET, PREVIOUS])

    def test_health_failure_restores_and_bounds_every_probe(self):
        result = self.deploy(FAIL_HEALTH=TARGET)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.root / "current").resolve().name, PREVIOUS)
        probes = [json.loads(x) for x in (self.root / "probes").read_text().splitlines()]
        self.assertTrue(probes)
        for args in probes:
            self.assertIn("--connect-timeout", args)
            self.assertIn("--max-time", args)

    def test_failed_rollback_restores_original_release(self):
        self.release(TARGET)
        result = self.execute("rollback.sh", TARGET, FAIL_RESTART=TARGET)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.root / "current").resolve().name, PREVIOUS)

    def test_successful_deploy_and_rollback(self):
        result = self.deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.root / "current").resolve().name, TARGET)
        result = self.execute("rollback.sh", PREVIOUS)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.root / "current").resolve().name, PREVIOUS)

    def test_corrupted_release_is_rejected_before_switch(self):
        self.release(TARGET)
        (self.root / "releases" / TARGET / "backend.jar").write_bytes(b"corrupted")
        result = self.execute("rollback.sh", TARGET)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.root / "current").resolve().name, PREVIOUS)

    def test_manifest_remains_readable_with_private_operator_umask(self):
        result = self.deploy(private_umask=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        manifest = self.root / "releases" / TARGET / "frontend/version.json"
        self.assertTrue(manifest.stat().st_mode & 0o004, "O Nginx precisa ler o manifesto público.")

    def test_concurrent_publication_is_rejected(self):
        with (self.root / ".release.lock").open("w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            result = self.deploy()
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual((self.root / "current").resolve().name, PREVIOUS)
            self.assertFalse((self.root / "restarts").exists())

    def test_immutable_release_is_not_overwritten(self):
        self.release(TARGET)
        result = self.deploy()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.root / "releases" / TARGET / "backend.jar").read_bytes(), b"old artifact")
        self.assertEqual((self.root / "current").resolve().name, PREVIOUS)


if __name__ == "__main__":
    unittest.main()
