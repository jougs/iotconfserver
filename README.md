# iotconfserver

The IoTConfserver manages and deploys the configuration to the custom IoT nodes. It is written in Node.js, uses InfluxDB for data collection and Grafana for visualizing it.

The latest version of Node.js can be installed by running
   ```bash
   curl -sL https://deb.nodesource.com/setup_15.x | bash -
   apt install nodejs
   ```

The confserver itself is available from GitHub:
```bash
git clone https://github.com/jougs/iotconfserver /srv/iotconfserver
```

```bash
useradd -r -d /srv/iotconfserver iotconfserver
chown -R iotconfserver:iotconfserver /srv/iotconfserver
```

```bash
su -s /bin/bash -c 'cd /srv/iotconfserver && npm install' iotconfserver
```

To ease starting, stopping and log management for the confserver, a systemd service file is provided in the repository. It can be installed using the following command:
```bash
cp /srv/iotconfserver/iotconfserver.service /lib/systemd/system/
systemctl daemon-reload
systemctl enable iotconfserver.service
systemctl start iotconfserver.service
```

The logs of the confserver can be accessed using
```
journalctl -u iotconfserver.service
```
