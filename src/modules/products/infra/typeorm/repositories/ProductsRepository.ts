import { getRepository, Repository, In } from 'typeorm';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICreateProductDTO from '@modules/products/dtos/ICreateProductDTO';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
import Product from '../entities/Product';

interface IFindProducts {
  id: string;
}

class ProductsRepository implements IProductsRepository {
  private ormRepository: Repository<Product>;

  constructor() {
    this.ormRepository = getRepository(Product);
  }

  public async create({
    name,
    price,
    quantity,
  }: ICreateProductDTO): Promise<Product> {
    const product = this.ormRepository.create({
      name,
      price,
      quantity,
    });
    await this.ormRepository.save(product);

    return product;
  }

  public async findByName(name: string): Promise<Product | undefined> {
    const product = await this.ormRepository.findOne({
      where: { name },
    });
    return product;
  }

  public async findAllById(products: IFindProducts[]): Promise<Product[]> {
    let filteredProducts: Product[];

    if (products.length > 0) {
      filteredProducts = await this.ormRepository.find({
        where: {
          id: In(products.map(product => product.id)),
        },
      });
    } else {
      filteredProducts = [];
    }

    return filteredProducts;
  }

  public async updateQuantity(
    products: IUpdateProductsQuantityDTO[],
  ): Promise<Product[]> {
    let updatedProducts: Product[] = [];

    if (products.length > 0) {
      const productIds = products.map(product => product.id);

      if (productIds && productIds.length > 0) {
        const listProducts = await this.ormRepository.findByIds(productIds);

        const parsedProducts = listProducts.map(product => {
          const quantityRequest = products.find(
            productRequest => productRequest.id === product.id,
          );
          const updatedProduct = product;
          updatedProduct.quantity = quantityRequest
            ? product.quantity - quantityRequest.quantity
            : product.quantity;
          return updatedProduct;
        });

        await this.ormRepository.save(parsedProducts);

        updatedProducts = parsedProducts;
      }
    }

    return updatedProducts;
  }
}

export default ProductsRepository;
