import { useEffect, useState } from 'react'
import './App.css'

export default function App() {
  const [products, setProducts] = useState([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadProducts() {
    const response = await fetch('/api/products')
    if (!response.ok) {
      throw new Error('Could not load products')
    }
    setProducts(await response.json())
  }

  useEffect(() => {
    loadProducts()
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false))
  }, [])

  async function onSubmit(event) {
    event.preventDefault()
    setError('')

    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price }),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setError(body.error || 'Could not add product')
      return
    }

    setName('')
    setPrice('')
    try {
      await loadProducts()
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  return (
    <main className="page">
      <header>
        <h1>ShopLite</h1>
        <p>Product catalogue</p>
      </header>

      <form onSubmit={onSubmit}>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label>
          Price
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            inputMode="decimal"
            required
          />
        </label>
        <button type="submit">Add product</button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      <section>
        <h2>Products</h2>
        {loading ? <p>Loading products…</p> : null}
        {!loading && products.length === 0 ? <p>No products yet.</p> : null}
        <ul>
          {products.map((product) => (
            <li key={product.id}>
              <span>{product.name}</span>
              <span>{Number(product.price).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
