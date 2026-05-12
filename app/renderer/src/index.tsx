/* @refresh reload */
import 'highlight.js/styles/atom-one-dark.css'
import { render } from 'solid-js/web'
import './index.css'
import App from './App'

const root = document.getElementById('root')

if (!root) {
    throw new Error('No root found.')
}

render(() => <App />, root!)
