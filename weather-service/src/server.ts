import * as dotenv from 'dotenv';
dotenv.config();

import { port } from './config';
import app from './app';


app.listen(port, () => {
	console.info(`server running on port : http://localhost:${port}`);
}).on('error', (e) => console.error(e));