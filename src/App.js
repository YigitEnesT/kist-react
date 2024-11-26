import React from 'react';
import './App.css';
import './index.css';
import Search from './Search';
import 'bootstrap/dist/css/bootstrap.min.css';


function App() {
    return (
        <div className="App">
            <h1 className='mt-4'>KİST - ElasticSearch</h1>
            <Search />
        </div>
    );
}


export default App;
