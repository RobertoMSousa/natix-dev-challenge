import express, { Request, Response } from 'express';
import routes from './routes';

const app = express();
app.use(express.json());
app.use(express.urlencoded());


app.route('/').get((req: Request, res: Response) => {
    res.send('Hello World!');
});

app.use('/api/v1', routes);


export default app;