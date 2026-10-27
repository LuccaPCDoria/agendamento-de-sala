import serverless from 'serverless-http';
import { criarApp } from '../../server/app';
import { dependenciasPadrao } from '../../server/dependencias';

export const handler = serverless(criarApp(dependenciasPadrao()));
