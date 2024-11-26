import React, { useState, useEffect } from 'react';
import axios from 'axios';
import "./Search.css";

const Search = () => {
    const [query, setQuery] = useState('');
    const [index, setIndex] = useState('');
    const [results, setResults] = useState([]);
    const [count, setCount] = useState();
    const [size, setSize] = useState(10);
    const [indices, setIndices] = useState([]);
    const [formattedIndices, setFormattedIndices] = useState([]);
    const [minYear, setMinYear] = useState('');
    const [maxYear, setMaxYear] = useState('');
    const [order, setOrder] = useState('desc');


    useEffect(() => {
        const fetchIndices = async () => {
            try {
                const response = await axios.get('http://localhost:9200/_cat/indices?v');
                const indexData = response.data
                    .split('\n')
                    .slice(1)
                    .filter(row => row)
                    .map(row => row.split(/\s+/)[2])
                    .filter(name => !name.startsWith('.') && !name.includes('alerts'));

                const formattedNames = indexData.map(formatIndexName);

                setIndices(indexData);
                setFormattedIndices(formattedNames);
                if (formattedNames.length > 0) {
                    setIndex(indexData[0]);
                }
            } catch (error) {
                console.error("Error fetching indices:", error);
            }
        };

        fetchIndices();
    }, []);

    const formatIndexName = (indexName) => {
        return indexName
            .replace(/-/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const handleSearch = async () => {
        const searchTerms = query.split(' ').filter(term => term);

        const mustQueries = searchTerms.map(term => ({
            match: {
                Başlık: {
                    query: term,
                    fuzziness: "AUTO"
                }
            }
        }));

        const queryBody = {
            query: {
                function_score: {
                    query: {
                        bool: {
                            must: mustQueries,
                            filter: []
                        }
                    },
                    functions: [
                        {
                            filter: { match: { Başlık: { query: query, operator: "and" } } },
                            weight: 100 // Tam eşleşmelere çok yüksek ağırlık ver
                        },
                        {
                            filter: { match: { Başlık: { query: query, fuzziness: "AUTO" } } },
                            weight: 1 // Fuzzy eşleşmelerin ağırlığını düşür
                        }
                    ],
                    boost_mode: "multiply", // Varsayılan skor ile boost etkisini topla
                    score_mode: "sum" // Fonksiyon skorlarını topla
                }
            },
            size: size,
            sort: [
                { "_score": "desc" }, // Skora göre sırala
                { "Yayin Yili": { order: order } } // Aynı skorlular arasında yıl sıralaması
            ]
        };

        if (minYear) {
            queryBody.query.function_score.query.bool.filter.push({
                range: {
                    "Yayin Yili": {
                        gte: minYear
                    }
                }
            });
        }

        if (maxYear) {
            queryBody.query.function_score.query.bool.filter.push({
                range: {
                    "Yayin Yili": {
                        lte: maxYear
                    }
                }
            });
        }

        try {
            const response = await axios.post(`http://localhost:9200/${index || '_all'}/_search`, queryBody, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            setCount(response.data.hits.total.value); // Toplam kayıt sayısı
            setResults(response.data.hits.hits); // Gelen sonuçları ayarla
        } catch (error) {
            console.error("Error fetching data from ElasticSearch:", error);
        }
    };



    useEffect(() => {
        handleSearch();
    }, [order]);

    const loadMoreResults = () => {
        setSize(prevSize => prevSize + 10);
        handleSearch();
    };

    const shortenTitle = (title) => {
        const match = title.match(/(.*?)(\(\d+ adet\))/);
        return match ? match[0] : title;
    };

    return (
        <div className="container mt-5 font-sans">
            <div className="form-group row">
                <div className="col-md-12">
                    <div className="flex rounded-full border-2 border-gray-300 hover:border-blue-400 overflow-hidden max-w-md mx-auto">
                        <input
                            type="text"
                            placeholder="Başlık ile arama yapın..."
                            className="w-full outline-none hover:bg-gray-100 text-md px-5 py-3 text-gray-700"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <button
                            type='button'
                            className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 px-6"
                            onClick={handleSearch}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192.904 192.904" width="18px" className="fill-white">
                                <path
                                    d="m190.707 180.101-47.078-47.077c11.702-14.072 18.752-32.142 18.752-51.831C162.381 36.423 125.959 0 81.191 0 36.422 0 0 36.423 0 81.193c0 44.767 36.422 81.187 81.191 81.187 19.688 0 37.759-7.049 51.831-18.751l47.079 47.078a7.474 7.474 0 0 0 5.303 2.197 7.498 7.498 0 0 0 5.303-12.803zM15 81.193C15 44.694 44.693 15 81.191 15c36.497 0 66.189 29.694 66.189 66.193 0 36.496-29.692 66.187-66.189 66.187C44.693 147.38 15 117.689 15 81.193z"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <hr className="my-6" />

            <div className="form-group row mt-4">
                <div className="col-md-3">
                    <select
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:outline-blue-500 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        value={index}
                        onChange={(e) => setIndex(e.target.value)}
                    >
                        <option value="">Bütün Kütüphaneler</option>
                        {formattedIndices.map((formattedName, idx) => (
                            <option key={indices[idx]} value={indices[idx]}>{formattedName}</option>
                        ))}
                    </select>
                </div>
                <div className="col-md-3">
                    <input
                        type="number"
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:outline-blue-500 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        value={minYear}
                        onChange={(e) => setMinYear(e.target.value)}
                        placeholder="Min Yıl"
                    />
                </div>
                <div className="col-md-3">
                    <input
                        type="number"
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:outline-blue-500 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        value={maxYear}
                        onChange={(e) => setMaxYear(e.target.value)}
                        placeholder="Max Yıl"
                    />
                </div>
                <div className="col-md-3">
                    <select
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:outline-blue-500 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        value={order}
                        onChange={(e) => setOrder(e.target.value)}
                    >
                        <option value="asc">Yılı Artan</option>
                        <option value="desc">Yılı Azalan</option>
                    </select>
                </div>

            </div>

            {results.length === 0 ? (
                <div className="my-8">
                    <div className="p-6 bg-body-secondary border border-gray-200 rounded-lg shadow-lg text-center">
                        <h5 className="text-xl font-semibold text-gray-600">Sonuç Bulunamadı</h5>
                        <p className="text-gray-500">Aramanızla eşleşen herhangi bir kayıt bulunamadı.</p>
                    </div>
                </div>
            ) : (
                <div className="my-8">
                    <h5 className="text-2xl font-semibold text-gray-600 mb-2">
                        {index || "Bütün Kütüphaneler"} - Arama Sonuçları ({count})
                    </h5>

                    <div className="space-y-6">
                        {results.map((result) => (
                            <div
                                key={result._id}
                                className="p-6 bg-white border border-gray-200 rounded-lg shadow-lg hover:shadow-2xl transition duration-200"
                            >
                                <ul className="space-y-3">
                                    <h1 className="text-lg font-semibold text-gray-500 mb-2 hover:text-blue-400 transition duration-200">{shortenTitle(result._source.Başlık)}</h1>
                                    <hr className='border-1'></hr>
                                    {Object.entries(result._source).map(([key, value]) => (
                                        <li key={key} className="text-gray-700">
                                            <span className="font-medium text-gray-800">{key}:</span>
                                            <ShowMoreText text={value} maxLength={300} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    {count > results.length && (
                        <div className="flex justify-center mt-8">
                            <button
                                className="px-6 py-2 text-white bg-blue-500 rounded-full hover:bg-blue-600 transition duration-200"
                                onClick={loadMoreResults}
                            >
                                Daha Fazla Yükle
                            </button>
                        </div>
                    )}
                </div>
            )}

        </div>
    );

};

const ShowMoreText = ({ text, maxLength }) => {
    const [showFullText, setShowFullText] = useState(false);

    const toggleShowMore = () => setShowFullText(prev => !prev);

    return (
        <span>
            {showFullText ? text : (text.length > maxLength ? `${text.slice(0, maxLength)}... ` : text)}
            {text.length > maxLength && (
                <button className="btn btn-link p-0" onClick={toggleShowMore}>
                    {showFullText ? 'Daha Az' : 'Daha Fazla'}
                </button>
            )}
        </span>
    );
};

export default Search;
